/**
 * AI-Powered Product Recommendation Engine
 * Provides intelligent product suggestions based on customer queries and preferences
 */

import { CatalogContext, Product } from './catalog-handler.ts';
import {
  createTextMessage,
  createButtonMessage,
  createListMessage,
  createImageMessage,
} from './whatsapp.ts';

interface RecommendationContext extends CatalogContext {
  customerHistory?: {
    viewedProducts: string[];
    viewedCategories: string[];
    searchQueries: string[];
  };
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Generate AI-powered product recommendations
 */
export async function generateRecommendations(
  context: RecommendationContext,
  query: string
): Promise<void> {
  try {
    // Try AI-powered recommendations first
    const useAI = Deno.env.get('OPENAI_API_KEY');
    
    if (useAI) {
      await generateAIRecommendations(context, query);
    } else {
      // Fallback to rule-based recommendations
      await generateRuleBasedRecommendations(context, query);
    }
  } catch (error) {
    console.error('Error generating recommendations:', error);
    // Fallback to rule-based on error
    await generateRuleBasedRecommendations(context, query);
  }
}

/**
 * Generate recommendations using OpenAI
 */
async function generateAIRecommendations(
  context: RecommendationContext,
  query: string
): Promise<void> {
  try {
    // Fetch available products
    const { data: products, error } = await context.supabase
      .from('products')
      .select('*')
      .eq('retailer_id', context.retailerId)
      .eq('is_active', true)
      .gt('stock_quantity', 0)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !products || products.length === 0) {
      await sendNoProductsMessage(context);
      return;
    }

    // Create product context for AI
    const productContext = products
      .map(
        (p: Product) =>
          `ID: ${p.id}, Name: ${p.name}, Category: ${p.category}, Price: ${p.price} XAF, Description: ${p.description || 'N/A'}`
      )
      .join('\n');

    // Prepare AI prompt
    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: `You are a helpful fashion retail assistant for a store in Cameroon. Your job is to recommend products based on customer queries.

Available Products:
${productContext}

Rules:
1. Recommend 3-5 products maximum
2. Match the customer's request as closely as possible
3. Consider price, category, and style
4. Provide brief reasons for each recommendation
5. If no good matches, suggest similar alternatives
6. Keep responses concise and friendly
7. Return recommendations in this exact JSON format:
{
  "recommendations": [
    {
      "product_id": "uuid",
      "reason": "brief reason (max 50 chars)"
    }
  ],
  "message": "friendly message to customer (max 200 chars)"
}`,
      },
      {
        role: 'user',
        content: query,
      },
    ];

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!openaiResponse.ok) {
      console.error('OpenAI API error:', await openaiResponse.text());
      await generateRuleBasedRecommendations(context, query);
      return;
    }

    const aiResult = await openaiResponse.json();
    const aiContent = aiResult.choices[0]?.message?.content;

    if (!aiContent) {
      await generateRuleBasedRecommendations(context, query);
      return;
    }

    // Parse AI response
    const parsed = JSON.parse(aiContent);
    const recommendedProducts = products.filter((p: Product) =>
      parsed.recommendations.some((r: any) => r.product_id === p.id)
    );

    if (recommendedProducts.length === 0) {
      await generateRuleBasedRecommendations(context, query);
      return;
    }

    // Send recommendations
    await sendRecommendations(context, recommendedProducts, parsed.message, true);
  } catch (error) {
    console.error('Error in AI recommendations:', error);
    await generateRuleBasedRecommendations(context, query);
  }
}

/**
 * Generate recommendations using rule-based logic
 */
async function generateRuleBasedRecommendations(
  context: RecommendationContext,
  query: string
): Promise<void> {
  try {
    const lowerQuery = query.toLowerCase();

    // Extract intent from query
    const intent = extractIntent(lowerQuery);

    // Fetch relevant products
    const { data: products, error } = await context.supabase
      .from('products')
      .select('*')
      .eq('retailer_id', context.retailerId)
      .eq('is_active', true)
      .gt('stock_quantity', 0)
      .order('created_at', { ascending: false });

    if (error || !products || products.length === 0) {
      await sendNoProductsMessage(context);
      return;
    }

    // Score and rank products
    const scoredProducts = products.map((p: Product) => ({
      product: p,
      score: scoreProduct(p, intent, lowerQuery),
    }));

    // Sort by score and take top 5
    scoredProducts.sort((a, b) => b.score - a.score);
    const recommendations = scoredProducts
      .filter((sp) => sp.score > 0)
      .slice(0, 5)
      .map((sp) => sp.product);

    if (recommendations.length === 0) {
      await sendNoMatchMessage(context, query);
      return;
    }

    // Create message
    const message = createRecommendationMessage(intent, recommendations.length);
    await sendRecommendations(context, recommendations, message, false);
  } catch (error) {
    console.error('Error in rule-based recommendations:', error);
    await sendErrorMessage(context);
  }
}

/**
 * Extract intent from customer query
 */
interface Intent {
  category?: string;
  priceRange?: { min: number; max: number };
  colors?: string[];
  occasion?: string;
  style?: string;
}

function extractIntent(query: string): Intent {
  const intent: Intent = {};

  // Categories
  const categories = [
    'dress',
    'dresses',
    'shirt',
    'shirts',
    'pants',
    'trousers',
    'shoe',
    'shoes',
    'bag',
    'bags',
    'jacket',
    'jackets',
    'skirt',
    'skirts',
    'accessory',
    'accessories',
  ];

  for (const cat of categories) {
    if (query.includes(cat)) {
      intent.category = cat.endsWith('s')
        ? cat.slice(0, -1)
        : cat + (cat.endsWith('s') ? '' : 's');
      break;
    }
  }

  // Colors
  const colors = [
    'red',
    'blue',
    'green',
    'black',
    'white',
    'yellow',
    'orange',
    'pink',
    'purple',
    'brown',
    'gray',
    'grey',
  ];

  intent.colors = colors.filter((color) => query.includes(color));

  // Price keywords
  if (query.includes('cheap') || query.includes('affordable') || query.includes('budget')) {
    intent.priceRange = { min: 0, max: 15000 };
  } else if (query.includes('expensive') || query.includes('luxury') || query.includes('premium')) {
    intent.priceRange = { min: 20000, max: 999999 };
  }

  // Occasions
  if (query.includes('wedding') || query.includes('formal') || query.includes('office')) {
    intent.occasion = 'formal';
  } else if (query.includes('casual') || query.includes('everyday') || query.includes('daily')) {
    intent.occasion = 'casual';
  } else if (query.includes('party') || query.includes('night') || query.includes('evening')) {
    intent.occasion = 'party';
  }

  // Style
  if (query.includes('summer') || query.includes('light')) {
    intent.style = 'summer';
  } else if (query.includes('winter') || query.includes('warm')) {
    intent.style = 'winter';
  }

  return intent;
}

/**
 * Score product relevance to intent
 */
function scoreProduct(product: Product, intent: Intent, query: string): number {
  let score = 0;

  // Category match (highest weight)
  if (intent.category && product.category.toLowerCase().includes(intent.category)) {
    score += 10;
  }

  // Name/description keyword match
  const productText = `${product.name} ${product.description || ''}`.toLowerCase();
  if (productText.includes(query)) {
    score += 8;
  }

  // Color match
  if (intent.colors && intent.colors.length > 0) {
    const productColors = product.colors || [];
    const hasColorMatch = intent.colors.some((color) =>
      productColors.some((pc) => pc.toLowerCase().includes(color))
    );
    if (hasColorMatch) {
      score += 5;
    }
  }

  // Price range match
  if (intent.priceRange) {
    if (product.price >= intent.priceRange.min && product.price <= intent.priceRange.max) {
      score += 3;
    }
  }

  // Stock availability (bonus)
  if (product.stock_quantity > 5) {
    score += 1;
  }

  return score;
}

/**
 * Create contextual message for recommendations
 */
function createRecommendationMessage(intent: Intent, count: number): string {
  const messages = [
    `🎯 Found ${count} perfect ${intent.category ? intent.category : 'items'} for you!`,
    `✨ Here are ${count} great options I think you'll love!`,
    `💎 Based on what you're looking for, check these ${count} out!`,
    `🌟 I've selected ${count} items that match your style!`,
  ];

  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Send recommendations to customer
 */
async function sendRecommendations(
  context: RecommendationContext,
  products: Product[],
  message: string,
  isAI: boolean
): Promise<void> {
  // Send intro message
  const intro = createTextMessage(
    context.customerPhone,
    `${message}\n\n${isAI ? '🤖 AI-powered recommendations' : '💡 Curated just for you'}`
  );
  await sendMessage(context, intro);

  // Send product list
  const rows = products.map((p: Product) => ({
    id: `prod_${p.id}`,
    title: p.name.substring(0, 24),
    description: `${formatPrice(p.price)} XAF - ${p.stock_quantity} available`,
  }));

  const listMessage = createListMessage(
    context.customerPhone,
    '👇 Tap to see full details:',
    'View Products',
    [{ title: 'Recommendations', rows }]
  );

  await sendMessage(context, listMessage);
}

/**
 * Send "no products" message
 */
async function sendNoProductsMessage(context: RecommendationContext): Promise<void> {
  const message = createTextMessage(
    context.customerPhone,
    '😔 Sorry, no products are currently available. Please check back soon!'
  );
  await sendMessage(context, message);
}

/**
 * Send "no match" message
 */
async function sendNoMatchMessage(
  context: RecommendationContext,
  query: string
): Promise<void> {
  const message = createButtonMessage(
    context.customerPhone,
    `🔍 Couldn't find exact matches for "${query}"\n\nWould you like to browse all products instead?`,
    [
      { id: 'browse_catalog', title: '🛍️ Browse All' },
      { id: 'show_help', title: '❓ Help' },
    ]
  );
  await sendMessage(context, message);
}

/**
 * Send error message
 */
async function sendErrorMessage(context: RecommendationContext): Promise<void> {
  const message = createTextMessage(
    context.customerPhone,
    '⚠️ Sorry, something went wrong. Please try browsing our catalog instead!'
  );
  await sendMessage(context, message);
}

/**
 * Helper to send message and store in database
 */
async function sendMessage(context: RecommendationContext, message: any): Promise<void> {
  const { sendWhatsAppMessage } = await import('./whatsapp.ts');
  
  // Send via WhatsApp
  const result = await sendWhatsAppMessage(context.whatsappConfig, message);

  if (!result.success) {
    console.error('Failed to send message:', result.error);
    return;
  }

  // Store in database
  let content = '';
  if (message.type === 'text') {
    content = message.text.body;
  } else if (message.type === 'interactive') {
    content = message.interactive.body.text;
  }

  await context.supabase.from('messages').insert({
    retailer_id: context.retailerId,
    customer_id: context.customerId,
    direction: 'outbound',
    message_type: message.type,
    content,
    whatsapp_message_id: result.messageId,
    status: 'sent',
    metadata: {
      timestamp: new Date().toISOString(),
      is_recommendation: true,
    },
  });
}

/**
 * Format price with thousands separator
 */
function formatPrice(price: number): string {
  return price.toLocaleString('en-US');
}

/**
 * Track customer interaction for future recommendations
 */
export async function trackInteraction(
  context: RecommendationContext,
  interactionType: 'view' | 'search' | 'order',
  data: {
    productId?: string;
    category?: string;
    query?: string;
  }
): Promise<void> {
  try {
    // Get current metadata
    const { data: customer } = await context.supabase
      .from('customers')
      .select('metadata')
      .eq('id', context.customerId)
      .single();

    const metadata = customer?.metadata || {};
    const history = metadata.interaction_history || {
      viewed_products: [],
      viewed_categories: [],
      search_queries: [],
    };

    // Update based on interaction type
    if (interactionType === 'view' && data.productId) {
      if (!history.viewed_products.includes(data.productId)) {
        history.viewed_products = [data.productId, ...history.viewed_products].slice(0, 50);
      }
    }

    if (data.category) {
      if (!history.viewed_categories.includes(data.category)) {
        history.viewed_categories = [data.category, ...history.viewed_categories].slice(0, 20);
      }
    }

    if (interactionType === 'search' && data.query) {
      history.search_queries = [data.query, ...history.search_queries].slice(0, 30);
    }

    // Update customer metadata
    await context.supabase
      .from('customers')
      .update({
        metadata: {
          ...metadata,
          interaction_history: history,
          last_interaction: new Date().toISOString(),
        },
      })
      .eq('id', context.customerId);
  } catch (error) {
    console.error('Error tracking interaction:', error);
  }
}
