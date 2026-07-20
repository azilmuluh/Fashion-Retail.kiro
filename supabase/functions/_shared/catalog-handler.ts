/**
 * Product Catalog Handler for WhatsApp
 * Handles product browsing, search, and catalog navigation
 */

import {
  createTextMessage,
  createButtonMessage,
  createListMessage,
  createImageMessage,
  sendWhatsAppMessage,
  type WhatsAppConfig,
} from './whatsapp.ts';
import { generateRecommendations, trackInteraction } from './ai-recommendations.ts';
import { handleOrderMessage } from './order-handler.ts';
import { handleLoyaltyMessage } from './loyalty-handler.ts';

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  stock_quantity: number;
  images: string[] | null;
  sizes: string[] | null;
  colors: string[] | null;
  sku: string | null;
}

export interface CatalogContext {
  supabase: any;
  whatsappConfig: WhatsAppConfig;
  retailerId: string;
  customerId: string;
  customerPhone: string;
}

/**
 * Handle catalog-related messages
 */
export async function handleCatalogMessage(
  context: CatalogContext,
  messageText: string,
  messageType: string,
  payload?: string
): Promise<void> {
  const lowerText = messageText?.toLowerCase() || '';
  
  // Handle interactive button/list responses
  if (messageType === 'interactive' && payload) {
    // Check if it's an order-related action first
    if (
      payload.startsWith('order_') ||
      payload.startsWith('qty_') ||
      payload.startsWith('size_') ||
      payload.startsWith('color_') ||
      payload === 'confirm_order' ||
      payload === 'cancel_order' ||
      payload === 'view_orders'
    ) {
      await handleOrderMessage(context, messageText, payload);
      return;
    }

    await handleInteractiveResponse(context, payload);
    return;
  }

  // Handle text messages
  if (messageType === 'text') {
    // Greetings
    if (
      lowerText.includes('hi') ||
      lowerText.includes('hello') ||
      lowerText.includes('hey') ||
      lowerText.includes('bonjour') ||
      lowerText.includes('salut')
    ) {
      await sendWelcomeMessage(context);
      return;
    }

    // Browse catalog
    if (
      lowerText.includes('catalog') ||
      lowerText.includes('catalogue') ||
      lowerText.includes('browse') ||
      lowerText.includes('shop') ||
      lowerText.includes('products')
    ) {
      await sendCategoryList(context);
      return;
    }

    // Search products
    if (
      lowerText.includes('search') ||
      lowerText.includes('find') ||
      lowerText.includes('looking for')
    ) {
      const searchTerm = lowerText
        .replace(/search|find|looking for/g, '')
        .trim();
      if (searchTerm) {
        await searchProducts(context, searchTerm);
        return;
      }
    }

    // Help
    if (lowerText.includes('help') || lowerText.includes('aide')) {
      await sendHelpMessage(context);
      return;
    }

    // Order-related queries
    if (
      lowerText.includes('my order') ||
      lowerText.includes('order status') ||
      lowerText.includes('track order')
    ) {
      await handleOrderMessage(context, messageText);
      return;
    }

    // Loyalty/points queries
    if (
      lowerText.includes('points') ||
      lowerText.includes('rewards') ||
      lowerText.includes('balance') ||
      lowerText.includes('redeem')
    ) {
      await handleLoyaltyMessage(context, messageText);
      return;
    }

    // AI Recommendations - catch natural language queries
    if (
      lowerText.includes('recommend') ||
      lowerText.includes('suggest') ||
      lowerText.includes('need') ||
      lowerText.includes('want') ||
      lowerText.includes('looking for') ||
      lowerText.includes('show me') ||
      lowerText.includes('i like')
    ) {
      await generateRecommendations(context, messageText);
      await trackInteraction(context, 'search', { query: messageText });
      return;
    }

    // Default: suggest browsing catalog
    await sendDefaultMessage(context);
  }
}

/**
 * Handle interactive button/list responses
 */
async function handleInteractiveResponse(
  context: CatalogContext,
  payload: string
): Promise<void> {
  // Category selection: cat_<category>
  if (payload.startsWith('cat_')) {
    const category = payload.replace('cat_', '');
    await sendProductsByCategory(context, category);
    await trackInteraction(context, 'view', { category });
    return;
  }

  // Browse catalog
  if (payload === 'browse_catalog') {
    await sendCategoryList(context);
    return;
  }

  // Show help
  if (payload === 'show_help') {
    await sendHelpMessage(context);
    return;
  }

  // Product details: prod_<productId>
  if (payload.startsWith('prod_')) {
    const productId = payload.replace('prod_', '');
    await sendProductDetails(context, productId);
    await trackInteraction(context, 'view', { productId });
    return;
  }

  // View more products in category: more_<category>
  if (payload.startsWith('more_')) {
    const category = payload.replace('more_', '');
    await sendProductsByCategory(context, category, 10);
    return;
  }

  // Back to categories
  if (payload === 'back_categories') {
    await sendCategoryList(context);
    return;
  }

  // Main menu
  if (payload === 'main_menu') {
    await sendWelcomeMessage(context);
    return;
  }
}

/**
 * Send welcome message with main options
 */
async function sendWelcomeMessage(context: CatalogContext): Promise<void> {
  const message = createButtonMessage(
    context.customerPhone,
    '👋 Welcome to our fashion store!\n\nHow can we help you today?',
    [
      { id: 'browse_catalog', title: '🛍️ Browse Catalog' },
      { id: 'show_help', title: '❓ Help' },
    ],
    '✨ FASHION STORE'
  );

  await sendMessage(context, message);
}

/**
 * Send help message
 */
async function sendHelpMessage(context: CatalogContext): Promise<void> {
  const helpText = `🤝 *HOW TO SHOP*

📱 *Browse*: Say "catalog" to see all categories
🔍 *Search*: Say "search [item]" to find products
🤖 *Ask AI*: Just describe what you need naturally!

*Examples:*
• "I need a red dress for a wedding"
• "Show me affordable shoes"
• "Recommend something casual"
• "I'm looking for summer clothes"

Reply "catalog" to start browsing!`;

  const message = createTextMessage(context.customerPhone, helpText);
  await sendMessage(context, message);
}

/**
 * Send default suggestion message
 */
async function sendDefaultMessage(context: CatalogContext): Promise<void> {
  const message = createButtonMessage(
    context.customerPhone,
    '💬 Not sure what you need?\n\nBrowse our catalog or tell us what you\'re looking for!',
    [
      { id: 'browse_catalog', title: '🛍️ Browse Catalog' },
      { id: 'show_help', title: '❓ Help' },
    ]
  );

  await sendMessage(context, message);
}

/**
 * Send category list
 */
async function sendCategoryList(context: CatalogContext): Promise<void> {
  try {
    // Get all categories with product counts
    const { data: products, error } = await context.supabase
      .from('products')
      .select('category')
      .eq('retailer_id', context.retailerId)
      .eq('is_active', true)
      .gt('stock_quantity', 0);

    if (error) throw error;

    if (!products || products.length === 0) {
      const message = createTextMessage(
        context.customerPhone,
        '📦 Sorry, no products are currently available. Please check back later!'
      );
      await sendMessage(context, message);
      return;
    }

    // Count products per category
    const categoryCounts = products.reduce((acc: any, p: any) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {});

    // Create list sections
    const rows = Object.keys(categoryCounts).map((category) => ({
      id: `cat_${category}`,
      title: category.charAt(0).toUpperCase() + category.slice(1),
      description: `${categoryCounts[category]} items available`,
    }));

    const message = createListMessage(
      context.customerPhone,
      '🏪 *Browse Our Collections*\n\nSelect a category to explore:',
      'View Categories',
      [{ title: 'Categories', rows }]
    );

    await sendMessage(context, message);
  } catch (error) {
    console.error('Error sending category list:', error);
    await sendErrorMessage(context);
  }
}

/**
 * Send products by category
 */
async function sendProductsByCategory(
  context: CatalogContext,
  category: string,
  limit: number = 5
): Promise<void> {
  try {
    const { data: products, error } = await context.supabase
      .from('products')
      .select('*')
      .eq('retailer_id', context.retailerId)
      .eq('category', category)
      .eq('is_active', true)
      .gt('stock_quantity', 0)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    if (!products || products.length === 0) {
      const message = createTextMessage(
        context.customerPhone,
        `📦 No products found in "${category}" category.`
      );
      await sendMessage(context, message);
      return;
    }

    // Format products as list
    const rows = products.map((p: Product) => ({
      id: `prod_${p.id}`,
      title: p.name.substring(0, 24),
      description: `${formatPrice(p.price)} XAF - ${p.stock_quantity} in stock`,
    }));

    const message = createListMessage(
      context.customerPhone,
      `🛍️ *${category.toUpperCase()}*\n\nFound ${products.length} products:`,
      'View Products',
      [{ title: 'Products', rows }]
    );

    await sendMessage(context, message);
  } catch (error) {
    console.error('Error sending products by category:', error);
    await sendErrorMessage(context);
  }
}

/**
 * Send product details
 */
async function sendProductDetails(
  context: CatalogContext,
  productId: string
): Promise<void> {
  try {
    const { data: product, error } = await context.supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('retailer_id', context.retailerId)
      .single();

    if (error || !product) {
      const message = createTextMessage(
        context.customerPhone,
        '❌ Product not found or no longer available.'
      );
      await sendMessage(context, message);
      return;
    }

    // Format product details
    let details = `🏷️ *${product.name.toUpperCase()}*\n\n`;
    details += `💰 *Price:* ${formatPrice(product.price)} XAF\n`;
    details += `📦 *Stock:* ${product.stock_quantity} available\n`;
    details += `📂 *Category:* ${product.category}\n`;
    
    if (product.sku) {
      details += `🔖 *SKU:* ${product.sku}\n`;
    }

    if (product.description) {
      details += `\n📝 *Description:*\n${product.description}\n`;
    }

    if ((product.sizes && product.sizes.length > 0) || (product.colors && product.colors.length > 0)) {
      details += `\n✨ *Available Options:*\n`;
      if (product.sizes && product.sizes.length > 0) {
        details += `• Sizes: ${product.sizes.join(', ')}\n`;
      }
      if (product.colors && product.colors.length > 0) {
        details += `• Colors: ${product.colors.join(', ')}\n`;
      }
    }

    // Send product image if available
    if (product.images && product.images.length > 0) {
      const imageMessage = createImageMessage(
        context.customerPhone,
        product.images[0],
        details
      );
      await sendMessage(context, imageMessage);
    } else {
      const textMessage = createTextMessage(context.customerPhone, details);
      await sendMessage(context, textMessage);
    }

    // Send action buttons
    const actionMessage = createButtonMessage(
      context.customerPhone,
      'What would you like to do?',
      [
        { id: `order_${productId}`, title: '🛒 Order Now' },
        { id: `back_categories`, title: '⬅️ Back' },
      ]
    );

    await sendMessage(context, actionMessage);
  } catch (error) {
    console.error('Error sending product details:', error);
    await sendErrorMessage(context);
  }
}

/**
 * Search products by keyword
 */
async function searchProducts(
  context: CatalogContext,
  searchTerm: string
): Promise<void> {
  try {
    const { data: products, error } = await context.supabase
      .from('products')
      .select('*')
      .eq('retailer_id', context.retailerId)
      .eq('is_active', true)
      .gt('stock_quantity', 0)
      .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .limit(10);

    if (error) throw error;

    if (!products || products.length === 0) {
      const message = createTextMessage(
        context.customerPhone,
        `🔍 No products found for "${searchTerm}"\n\nTry browsing by category instead!`
      );
      await sendMessage(context, message);
      
      // Show category list
      await sendCategoryList(context);
      return;
    }

    // Format products as list
    const rows = products.map((p: Product) => ({
      id: `prod_${p.id}`,
      title: p.name.substring(0, 24),
      description: `${formatPrice(p.price)} XAF - ${p.category}`,
    }));

    const message = createListMessage(
      context.customerPhone,
      `🔍 *Search Results: "${searchTerm}"*\n\nFound ${products.length} products:`,
      'View Products',
      [{ title: 'Results', rows }]
    );

    await sendMessage(context, message);
  } catch (error) {
    console.error('Error searching products:', error);
    await sendErrorMessage(context);
  }
}

/**
 * Send error message
 */
async function sendErrorMessage(context: CatalogContext): Promise<void> {
  const message = createTextMessage(
    context.customerPhone,
    '⚠️ Sorry, something went wrong. Please try again or contact support.'
  );
  await sendMessage(context, message);
}

/**
 * Helper to send message and store in database
 */
async function sendMessage(
  context: CatalogContext,
  message: any
): Promise<void> {
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
  } else if (message.type === 'image') {
    content = message.image.caption || '[Image]';
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
    },
  });
}

/**
 * Format price with thousands separator
 */
function formatPrice(price: number): string {
  return price.toLocaleString('en-US');
}
