// AI Catalog Generator Edge Function
// Analyzes product images and generates catalog entries using OpenAI Vision

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProductAnalysis {
  name: string
  description: string
  category: string
  suggestedPrice: number
  colors: string[]
  sizes: string[]
  occasion: string
  style: string
  material: string
  confidence: number
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

    const { images } = await req.json()

    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(JSON.stringify({ error: 'Images array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (images.length > 50) {
      return new Response(JSON.stringify({ error: 'Maximum 50 images allowed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Analyze each image with OpenAI Vision
    const analyses: ProductAnalysis[] = []

    for (const imageUrl of images) {
      const analysis = await analyzeProductImage(imageUrl)
      analyses.push(analysis)
    }

    return new Response(JSON.stringify({ products: analyses }), {
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

async function analyzeProductImage(imageUrl: string): Promise<ProductAnalysis> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this fashion product image for a Cameroon retail catalog. Provide:
              
1. Product name (specific, e.g., "Blue Floral Midi Dress")
2. Detailed description (2-3 sentences highlighting features, fit, occasion)
3. Category (one of: Dresses, Tops, Bottoms, Shoes, Accessories, Bags, Outerwear, Activewear, Jewelry, Traditional)
4. Suggested retail price in XAF (Cameroon Francs) - consider local market pricing
5. Visible colors (array of color names)
6. Available sizes (guess based on product type: S,M,L,XL for clothing)
7. Occasion (casual, formal, business, party, traditional, sports)
8. Style (modern, classic, trendy, vintage, boho, elegant, streetwear)
9. Material (if visible: cotton, silk, polyester, leather, etc.)
10. Confidence score (0-100) for analysis quality

Respond ONLY with valid JSON in this exact format:
{
  "name": "string",
  "description": "string",
  "category": "string",
  "suggestedPrice": number,
  "colors": ["string"],
  "sizes": ["string"],
  "occasion": "string",
  "style": "string",
  "material": "string",
  "confidence": number
}

Be specific and use Cameroon fashion market context.`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.3
    })
  })

  const data = await response.json()
  
  if (data.error) {
    throw new Error(data.error.message)
  }

  const content = data.choices[0].message.content
  const analysis = JSON.parse(content.trim())

  return analysis
}
