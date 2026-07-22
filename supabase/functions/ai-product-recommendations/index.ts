/**
 * AI Product Recommendation Engine
 * 
 * Uses OpenAI GPT-4 to understand customer queries and recommend relevant products.
 * 
 * Solves:
 * - "Time wasted answering same questions" - AI handles product inquiries 24/7
 * - "Ghost shoppers who never convert" - AI provides personalized recommendations
 * - "Cannot find what they want" - Natural language understanding
 * 
 * Features:
 * - Natural language product search
 * - Context-aware recommendations based on conversation history
 * - Personalized suggestions based on customer preferences
 * - Similar product recommendations
 * - Occasion-based suggestions (wedding, party, casual, etc.)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface RecommendationRequest {
  query: string;
  customerId: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  context?: {
    previousProducts?: string[];
    budget?: number;
    occasion?: string;
    preferences?: any;
  };
}

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  stock_quantity: number;
  sizes?: string[];
  colors?: string[];
  images?: string[];
  tags?: string[];
}

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const requestData: RecommendationRequest = await req.json();
    const { query, customerId, conversationHistory, context } = requestData;

    console.log('Processing AI recommendation request:', { query, customerId });

    // 1. Get customer profile and preferences
    const customer = await getCustomerProfile(customerId);

    // 2. Get conversation context
    const recentConversation = conversationHistory || await getRecentConversation(customerId);

    // 3. Extract intent and parameters from query using AI
    const intent = await analyzeQueryIntent(query, recentConversation, customer);

    console.log('Detected intent:', intent);

    // 4. Get relevant products from database
    const products = await searchProducts(intent);

    // 5. Use AI to rank and explain recommendations
    const recommendations = await generateRecommendations(
      query,
      products,
      customer,
      intent,
      context
    );

    // 6. Log recommendation for analytics
    await logRecommendation(customerId, query, intent, recommendations);

    return new Response(
      JSON.stringify({
        success: true,
        query,
        intent,
        recommendations,
        conversationContext: {
          preferredCategories: customer.preferredCategories,
          priceRange: customer.averageOrderValue,
        },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error processing AI recommendation:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        fallback: 'Please browse our catalog or contact us for personalized assistance.'
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});

/**
 * Get customer profile with preferences and history
 */
async function getCustomerProfile(customerId: string) {
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();

  if (!customer) {
    return {
      id: customerId,
      preferredCategories: [],
      averageOrderValue: null,
      previousPurchases: [],
    };
  }

  // Get customer's order history
  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(product_id, quantity, price)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Calculate average order value
  const totalSpent = orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
  const averageOrderValue = orders?.length ? totalSpent / orders.length : null;

  // Get preferred categories from interaction history
  const { data: interactions } = await supabase
    .from('customer_interactions')
    .select('metadata')
    .eq('customer_id', customerId)
    .in('interaction_type', ['product_viewed', 'category_browsed'])
    .order('created_at', { ascending: false })
    .limit(50);

  const categoryCounts: Record<string, number> = {};
  interactions?.forEach((interaction) => {
    const category = interaction.metadata?.category;
    if (category) {
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    }
  });

  const preferredCategories = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([category]) => category);

  return {
    ...customer,
    preferredCategories,
    averageOrderValue,
    previousPurchases: orders?.flatMap((o) => o.order_items.map((i: any) => i.product_id)) || [],
  };
}

/**
 * Get recent conversation history
 */
async function getRecentConversation(customerId: string) {
  const { data: messages } = await supabase
    .from('whatsapp_messages')
    .select('direction, content, created_at')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!messages || messages.length === 0) {
    return [];
  }

  return messages.reverse().map((msg) => ({
    role: msg.direction === 'inbound' ? 'user' : 'assistant',
    content: extractMessageText(msg.content),
  }));
}

/**
 * Extract text from WhatsApp message content
 */
function extractMessageText(content: any): string {
  if (content.text?.body) return content.text.body;
  if (content.interactive?.button_reply?.title) return content.interactive.button_reply.title;
  if (content.interactive?.list_reply?.title) return content.interactive.list_reply.title;
  return JSON.stringify(content);
}

/**
 * Analyze customer query using OpenAI to extract intent and parameters
 */
async function analyzeQueryIntent(
  query: string,
  conversationHistory: any[],
  customer: any
) {
  const systemPrompt = `You are a fashion retail assistant analyzing customer queries to understand their needs.

Customer Context:
- Preferred categories: ${customer.preferredCategories?.join(', ') || 'Unknown'}
- Average budget: ${customer.averageOrderValue ? `${customer.averageOrderValue} XAF` : 'Unknown'}

Extract the following from the customer's query:
1. Primary intent (search, recommendation, comparison, question)
2. Product type (dress, shoes, accessories, etc.)
3. Occasion (wedding, party, casual, work, etc.)
4. Style preferences (formal, casual, elegant, modern, traditional, etc.)
5. Budget constraints (if mentioned)
6. Size requirements (if mentioned)
7. Color preferences (if mentioned)
8. Specific features (material, brand, etc.)

Respond in JSON format only.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-5), // Last 5 messages for context
        { role: 'user', content: query },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error('OpenAI API request failed');
  }

  const data = await response.json();
  const intentData = JSON.parse(data.choices[0].message.content);

  return {
    primaryIntent: intentData.primary_intent || 'search',
    productType: intentData.product_type,
    occasion: intentData.occasion,
    style: intentData.style_preferences || [],
    budgetMax: intentData.budget_constraints?.max,
    budgetMin: intentData.budget_constraints?.min,
    sizes: intentData.size_requirements || [],
    colors: intentData.color_preferences || [],
    features: intentData.specific_features || [],
    originalQuery: query,
  };
}

/**
 * Search products based on extracted intent
 */
async function searchProducts(intent: any): Promise<Product[]> {
  let query = supabase
    .from('products')
    .select('*')
    .eq('is_active', true);

  // Filter by product type (category)
  if (intent.productType) {
    query = query.or(
      `category.ilike.%${intent.productType}%,name.ilike.%${intent.productType}%`
    );
  }

  // Filter by price range
  if (intent.budgetMin) {
    query = query.gte('price', intent.budgetMin);
  }
  if (intent.budgetMax) {
    query = query.lte('price', intent.budgetMax);
  }

  // Filter by color (if colors array exists in product)
  if (intent.colors && intent.colors.length > 0) {
    // PostgreSQL array contains query
    query = query.contains('colors', intent.colors);
  }

  // Filter by size availability
  if (intent.sizes && intent.sizes.length > 0) {
    query = query.contains('sizes', intent.sizes);
  }

  // Only in-stock products
  query = query.gt('stock_quantity', 0);

  // Limit results
  query = query.limit(20);

  const { data: products, error } = await query;

  if (error) {
    console.error('Product search error:', error);
    return [];
  }

  // If no exact matches, do a broader search
  if (!products || products.length === 0) {
    const { data: fallbackProducts } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .gt('stock_quantity', 0)
      .limit(10);

    return fallbackProducts || [];
  }

  // Rank products by relevance
  return rankProductsByRelevance(products, intent);
}

/**
 * Rank products by relevance to customer query
 */
function rankProductsByRelevance(products: Product[], intent: any): Product[] {
  return products
    .map((product) => {
      let score = 0;

      // Exact category match
      if (
        intent.productType &&
        product.category.toLowerCase().includes(intent.productType.toLowerCase())
      ) {
        score += 10;
      }

      // Name contains query terms
      if (
        intent.originalQuery &&
        product.name.toLowerCase().includes(intent.originalQuery.toLowerCase())
      ) {
        score += 8;
      }

      // Color match
      if (intent.colors && product.colors) {
        const matchingColors = intent.colors.filter((c: string) =>
          product.colors?.some((pc: string) => pc.toLowerCase() === c.toLowerCase())
        );
        score += matchingColors.length * 5;
      }

      // Size availability
      if (intent.sizes && product.sizes) {
        const matchingSizes = intent.sizes.filter((s: string) =>
          product.sizes?.includes(s)
        );
        score += matchingSizes.length * 3;
      }

      // Price within budget
      if (intent.budgetMax && product.price <= intent.budgetMax) {
        score += 5;
      }

      // Stock availability (prefer higher stock)
      if (product.stock_quantity > 5) {
        score += 2;
      }

      return { ...product, relevanceScore: score };
    })
    .sort((a, b) => (b as any).relevanceScore - (a as any).relevanceScore);
}

/**
 * Generate AI-powered product recommendations with explanations
 */
async function generateRecommendations(
  query: string,
  products: Product[],
  customer: any,
  intent: any,
  context?: any
) {
  if (products.length === 0) {
    return {
      count: 0,
      products: [],
      message: "I couldn't find exact matches, but let me show you our latest collection!",
      suggestions: ['Browse all products', 'Refine your search', 'Contact us for custom orders'],
    };
  }

  // Prepare product summaries for AI
  const productSummaries = products.slice(0, 10).map((p, idx) => ({
    index: idx,
    id: p.id,
    name: p.name,
    category: p.category,
    price: `${p.price} ${p.currency}`,
    description: p.description?.substring(0, 200),
    sizes: p.sizes,
    colors: p.colors,
  }));

  const systemPrompt = `You are a helpful fashion retail assistant in Cameroon. 
The customer asked: "${query}"

Available products:
${JSON.stringify(productSummaries, null, 2)}

Customer context:
- Preferred categories: ${customer.preferredCategories?.join(', ') || 'Unknown'}
- Average budget: ${customer.averageOrderValue ? `${customer.averageOrderValue} XAF` : 'Unknown'}

Select the top 3-5 most relevant products and explain WHY each one matches their needs.
Be friendly, personal, and helpful. Use emojis where appropriate.

Respond in JSON format with:
{
  "message": "A warm, personalized introduction message",
  "recommendations": [
    {
      "productIndex": 0,
      "reason": "Why this product fits their needs",
      "highlight": "Key feature to emphasize"
    }
  ],
  "additionalSuggestions": ["Other helpful suggestions"]
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    // Fallback if AI fails
    return {
      count: products.length,
      products: products.slice(0, 5).map((p) => ({
        ...p,
        reason: 'Matches your search criteria',
        highlight: p.name,
      })),
      message: `I found ${products.length} products for you!`,
      suggestions: [],
    };
  }

  const data = await response.json();
  const aiResponse = JSON.parse(data.choices[0].message.content);

  // Map AI recommendations back to full product objects
  const recommendedProducts = aiResponse.recommendations.map((rec: any) => {
    const product = products[rec.productIndex];
    return {
      ...product,
      aiReason: rec.reason,
      aiHighlight: rec.highlight,
    };
  });

  return {
    count: recommendedProducts.length,
    products: recommendedProducts,
    message: aiResponse.message,
    suggestions: aiResponse.additionalSuggestions || [],
    allMatchesCount: products.length,
  };
}

/**
 * Log recommendation for analytics
 */
async function logRecommendation(
  customerId: string,
  query: string,
  intent: any,
  recommendations: any
) {
  await supabase.from('customer_interactions').insert({
    customer_id: customerId,
    interaction_type: 'ai_recommendation',
    channel: 'whatsapp',
    metadata: {
      query,
      intent,
      recommendedProducts: recommendations.products?.map((p: any) => p.id) || [],
      recommendationCount: recommendations.count,
    },
  });
}
