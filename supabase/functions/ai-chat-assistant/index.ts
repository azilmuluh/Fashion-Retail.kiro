// AI Chat Assistant Edge Function
// Helps retailers with platform questions and business insights

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } }
      }
    )

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { message, conversationHistory, includeBusinessContext } = await req.json()

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get retailer info and business metrics if requested
    let businessContext = ''
    if (includeBusinessContext) {
      const context = await getBusinessContext(supabase, user.id)
      businessContext = context
    }

    // Build system prompt
    const systemPrompt = `You are an AI assistant for a WhatsApp Business platform designed for fashion retailers in Cameroon. Your role is to help retailers:

1. **Understand the platform**: Explain features like AI product catalog, WhatsApp integration, inventory analytics, ghost shopper tracking
2. **Provide business insights**: Analyze their metrics and suggest improvements
3. **Answer questions**: About features, pricing, best practices, Cameroon retail context
4. **Guide workflows**: How to add products, set up WhatsApp, interpret analytics

**Key Platform Features:**
- AI Bulk Upload: Upload up to 50 product images, AI analyzes and generates catalog entries
- WhatsApp Integration: Automated responses, order tracking, customer engagement
- Ghost Shopper Analytics: Track customers who inquire but don't buy, re-engage them
- Dead Stock Prediction: AI predicts which inventory will become dead stock 30-60 days early
- Mobile Money: MTN/Orange Money payment integration for Cameroon market

**Context:**
- Currency: XAF (CFA Franc)
- Languages: French, English, Pidgin
- Payment methods: Mobile money (90% of customers), cash on delivery
- Seasons matter: Back-to-school (Sept), Christmas (Dec), Easter

${businessContext ? `\n**Retailer's Business Data:**\n${businessContext}\n` : ''}

**Tone:** Friendly, supportive, and practical. Use examples relevant to Cameroon fashion retail. Keep responses concise but helpful.`

    // Build conversation messages
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory || []),
      { role: 'user', content: message }
    ]

    // Call OpenAI
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 500,
        temperature: 0.7
      })
    })

    const data = await response.json()
    
    if (data.error) {
      throw new Error(data.error.message)
    }

    const assistantMessage = data.choices[0].message.content

    // Log conversation for improvements
    await supabase.from('ai_chat_logs').insert({
      user_id: user.id,
      user_message: message,
      assistant_message: assistantMessage,
      included_context: !!businessContext
    })

    return new Response(JSON.stringify({ 
      message: assistantMessage,
      conversationId: data.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function getBusinessContext(supabase: any, userId: string): Promise<string> {
  try {
    // Get retailer
    const { data: retailer } = await supabase
      .from('retailers')
      .select('*')
      .eq('id', userId)
      .single()

    if (!retailer) return ''

    // Get products summary
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('retailer_id', retailer.id)

    const totalProducts = products?.length || 0
    const lowStockProducts = products?.filter(p => 
      p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold
    ).length || 0
    const outOfStockProducts = products?.filter(p => p.stock_quantity === 0).length || 0
    const totalStockValue = products?.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0) || 0

    // Get orders summary
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('retailer_id', retailer.id)

    const totalOrders = orders?.length || 0
    const totalRevenue = orders?.reduce((sum, o) => sum + o.total_amount, 0) || 0
    const pendingOrders = orders?.filter(o => 
      ['pending', 'confirmed', 'processing'].includes(o.status)
    ).length || 0

    // Get WhatsApp analytics if available
    const { data: messages } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('retailer_id', retailer.id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    const messagesLast30Days = messages?.length || 0

    return `
Business: ${retailer.business_name}
Total Products: ${totalProducts}
Low Stock Items: ${lowStockProducts}
Out of Stock Items: ${outOfStockProducts}
Total Stock Value: XAF ${totalStockValue.toLocaleString()}
Total Orders: ${totalOrders}
Pending Orders: ${pendingOrders}
Total Revenue: XAF ${totalRevenue.toLocaleString()}
WhatsApp Messages (30 days): ${messagesLast30Days}
`.trim()
  } catch (error) {
    console.error('Error getting business context:', error)
    return ''
  }
}
