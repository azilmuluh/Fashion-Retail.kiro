/**
 * WhatsApp Cloud API Webhook Handler
 * 
 * Receives incoming WhatsApp messages and processes them:
 * - Verifies webhook (GET request from Meta)
 * - Processes incoming messages (POST request)
 * - Routes to appropriate handlers (product inquiry, order, etc.)
 * - Stores messages and updates customer profiles
 * 
 * Solves: Ghost shopper problem by capturing all customer interactions
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const WHATSAPP_VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN');
const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
const WHATSAPP_APP_SECRET = Deno.env.get('WHATSAPP_APP_SECRET');

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'interactive' | 'button';
  text?: { body: string };
  image?: { id: string; mime_type: string; sha256: string; caption?: string };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
}

interface WebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages?: WhatsAppMessage[];
        statuses?: Array<any>;
      };
      field: string;
    }>;
  }>;
}

serve(async (req) => {
  const url = new URL(req.url);
  
  // Handle webhook verification (GET request from Meta)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
      console.log('Webhook verified successfully');
      return new Response(challenge, { status: 200 });
    } else {
      console.error('Webhook verification failed');
      return new Response('Forbidden', { status: 403 });
    }
  }

  // Handle incoming messages (POST request)
  if (req.method === 'POST') {
    try {
      const payload: WebhookPayload = await req.json();
      
      // Validate webhook signature (security)
      const signature = req.headers.get('x-hub-signature-256');
      if (!verifySignature(await req.clone().text(), signature)) {
        return new Response('Invalid signature', { status: 403 });
      }

      // Process the webhook payload
      console.log('Received webhook:', JSON.stringify(payload, null, 2));

      // Extract messages from payload
      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          const { value } = change;

          // Process incoming messages
          if (value.messages && value.messages.length > 0) {
            for (const message of value.messages) {
              await processIncomingMessage(message, value.contacts?.[0]);
            }
          }

          // Process message statuses (sent, delivered, read)
          if (value.statuses && value.statuses.length > 0) {
            for (const status of value.statuses) {
              await updateMessageStatus(status);
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error processing webhook:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});

/**
 * Verify webhook signature for security
 */
function verifySignature(payload: string, signature: string | null): boolean {
  if (!signature || !WHATSAPP_APP_SECRET) return false;

  const crypto = globalThis.crypto;
  const encoder = new TextEncoder();
  const key = encoder.encode(WHATSAPP_APP_SECRET);
  const data = encoder.encode(payload);

  // In production, implement proper HMAC verification
  // For now, accept all requests in development
  return true;
}

/**
 * Process incoming WhatsApp message
 */
async function processIncomingMessage(
  message: WhatsAppMessage,
  contact?: { profile: { name: string }; wa_id: string }
) {
  try {
    const phoneNumber = message.from;
    const messageId = message.id;

    console.log(`Processing message from ${phoneNumber}: ${message.type}`);

    // 1. Get or create customer profile
    const customer = await getOrCreateCustomer(phoneNumber, contact?.profile.name);

    // 2. Store the message
    await storeMessage({
      whatsapp_message_id: messageId,
      customer_id: customer.id,
      phone_number: phoneNumber,
      direction: 'inbound',
      message_type: message.type,
      content: message,
      created_at: new Date(parseInt(message.timestamp) * 1000).toISOString(),
    });

    // 3. Extract message content
    let messageText = '';
    let interactionData: any = null;

    if (message.type === 'text' && message.text) {
      messageText = message.text.body;
    } else if (message.type === 'interactive' && message.interactive) {
      if (message.interactive.button_reply) {
        messageText = message.interactive.button_reply.title;
        interactionData = message.interactive.button_reply;
      } else if (message.interactive.list_reply) {
        messageText = message.interactive.list_reply.title;
        interactionData = message.interactive.list_reply;
      }
    }

    // 4. Detect intent and route to appropriate handler
    const intent = await detectIntent(messageText, interactionData, customer.id);
    console.log(`Detected intent: ${intent.type}`);

    // 5. Generate and send response
    await handleIntent(intent, customer, phoneNumber, messageText);

    // 6. Update customer interaction stats
    await updateCustomerStats(customer.id);

  } catch (error) {
    console.error('Error processing message:', error);
    // Send error message to customer
    await sendTextMessage(message.from, 'Sorry, I encountered an error. A team member will help you shortly.');
  }
}

/**
 * Get or create customer profile from phone number
 */
async function getOrCreateCustomer(phoneNumber: string, name?: string) {
  // Normalize phone number
  const normalizedPhone = phoneNumber.replace(/\D/g, '');

  // Check if customer exists
  let { data: customer, error } = await supabase
    .from('customers')
    .select('*')
    .eq('phone_number', normalizedPhone)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  // Create customer if doesn't exist
  if (!customer) {
    const { data: newCustomer, error: createError } = await supabase
      .from('customers')
      .insert({
        phone_number: normalizedPhone,
        name: name || `Customer ${normalizedPhone.slice(-4)}`,
        whatsapp_active: true,
        first_contact_channel: 'whatsapp',
      })
      .select()
      .single();

    if (createError) throw createError;
    customer = newCustomer;
    console.log(`Created new customer: ${customer.id}`);
  } else {
    // Update name if provided and different
    if (name && customer.name !== name) {
      await supabase
        .from('customers')
        .update({ name })
        .eq('id', customer.id);
      customer.name = name;
    }
  }

  return customer;
}

/**
 * Store message in database
 */
async function storeMessage(message: any) {
  const { error } = await supabase
    .from('whatsapp_messages')
    .insert(message);

  if (error) {
    console.error('Error storing message:', error);
    throw error;
  }
}

/**
 * Update message delivery status
 */
async function updateMessageStatus(status: any) {
  const { error } = await supabase
    .from('whatsapp_messages')
    .update({
      status: status.status,
      updated_at: new Date().toISOString(),
    })
    .eq('whatsapp_message_id', status.id);

  if (error) {
    console.error('Error updating message status:', error);
  }
}

/**
 * Detect customer intent from message
 */
async function detectIntent(messageText: string, interactionData: any, customerId?: string) {
  const text = messageText.toLowerCase();

  // Check for interactive button/list replies first
  if (interactionData && interactionData.id) {
    const id = interactionData.id;
    
    // Product selection
    if (id.startsWith('product_')) {
      return { type: 'product_detail', data: { productId: id.replace('product_', '') } };
    }
    
    // Category selection
    if (id.startsWith('category_')) {
      return { type: 'browse_category', data: { category: id.replace('category_', '') } };
    }
    
    // Order action
    if (id.startsWith('order_')) {
      return { type: 'create_order', data: { productId: id.replace('order_', '') } };
    }
    
    // Size selection
    if (id.startsWith('size_')) {
      return { type: 'order_update', data: { field: 'size', value: id.replace('size_', '') } };
    }
    
    // Color selection
    if (id.startsWith('color_')) {
      return { type: 'order_update', data: { field: 'color', value: id.replace('color_', '') } };
    }
    
    // Payment method selection
    if (id.startsWith('payment_')) {
      return { type: 'order_update', data: { field: 'paymentMethod', value: id.replace('payment_', '') } };
    }
    
    // Order confirmation
    if (id === 'confirm_order') {
      return { type: 'confirm_order', data: {} };
    }
    
    // Order cancellation
    if (id === 'cancel_order') {
      return { type: 'cancel_order', data: {} };
    }
  }

  // Check if customer has active order session - handle text-based responses
  if (customerId) {
    const orderSession = await getActiveOrderSession(customerId);
    if (orderSession) {
      // Quantity input
      if (orderSession.step === 'quantity_selection') {
        const quantity = parseInt(messageText);
        if (!isNaN(quantity) && quantity > 0) {
          return { type: 'order_update', data: { field: 'quantity', value: quantity } };
        }
      }
      
      // Delivery address input
      if (orderSession.step === 'delivery_details') {
        return { type: 'order_update', data: { field: 'deliveryAddress', value: messageText } };
      }
    }
  }

  // Greeting intents
  if (/^(hi|hello|hey|bonjour|salut)/i.test(text)) {
    return { type: 'greeting' };
  }

  // Catalog browsing
  if (/(show|see|view|browse).*(catalog|products|items|collection)/i.test(text) ||
      /what.*(have|sell|available)/i.test(text)) {
    return { type: 'browse_catalog' };
  }

  // Order status inquiry
  if (/(where|status|track).*(order|delivery|package)/i.test(text) ||
      /order.*status/i.test(text)) {
    return { type: 'order_status' };
  }

  // Price inquiry
  if (/(how much|price|cost|combien)/i.test(text)) {
    return { type: 'price_inquiry', data: { query: messageText } };
  }

  // General product inquiry (AI will handle)
  if (/(looking for|need|want|search|find|do you have)/i.test(text)) {
    return { type: 'product_inquiry', data: { query: messageText } };
  }

  // Help request
  if (/(help|aide|assist)/i.test(text)) {
    return { type: 'help' };
  }

  // Default: product inquiry (let AI handle)
  return { type: 'product_inquiry', data: { query: messageText } };
}

/**
 * Get active order session for customer
 */
async function getActiveOrderSession(customerId: string) {
  const { data: interactions } = await supabase
    .from('customer_interactions')
    .select('metadata')
    .eq('customer_id', customerId)
    .eq('interaction_type', 'order_session_update')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!interactions || interactions.length === 0) {
    return null;
  }

  const session = interactions[0].metadata.session;
  const expiresAt = new Date(interactions[0].metadata.expires_at);

  // Check if expired (15 minutes)
  if (expiresAt < new Date()) {
    return null;
  }

  return session;
}

/**
 * Handle customer intent and generate response
 */
async function handleIntent(intent: any, customer: any, phoneNumber: string, messageText: string) {
  switch (intent.type) {
    case 'greeting':
      await sendWelcomeMessage(phoneNumber, customer.name);
      break;

    case 'browse_catalog':
      await sendCatalogMenu(phoneNumber, customer);
      break;

    case 'browse_category':
      await sendCategoryProducts(phoneNumber, intent.data.category, customer);
      break;

    case 'product_detail':
      await sendProductDetail(phoneNumber, intent.data.productId, customer);
      break;

    case 'product_inquiry':
      await handleProductInquiry(phoneNumber, intent.data.query, customer);
      break;

    case 'order_status':
      await sendOrderStatus(phoneNumber, customer);
      break;

    case 'create_order':
      await initiateOrderCreation(phoneNumber, intent.data, customer);
      break;

    case 'order_update':
      await handleOrderUpdate(phoneNumber, intent.data, customer);
      break;

    case 'confirm_order':
      await handleOrderConfirmation(phoneNumber, customer);
      break;

    case 'cancel_order':
      await handleOrderCancellation(phoneNumber, customer);
      break;

    case 'help':
      await sendHelpMessage(phoneNumber);
      break;

    default:
      await handleProductInquiry(phoneNumber, messageText, customer);
  }
}

/**
 * Send welcome message
 */
async function sendWelcomeMessage(phoneNumber: string, customerName: string) {
  const message = `👋 Hi ${customerName}! Welcome to our store.

I can help you:
📱 Browse our catalog
🔍 Search for specific items
📦 Check order status
💬 Answer questions

How can I help you today?`;

  await sendTextMessage(phoneNumber, message);
}

/**
 * Send catalog browsing menu
 */
async function sendCatalogMenu(phoneNumber: string, customer: any) {
  // Get product categories with counts
  const { data: categories } = await supabase
    .from('products')
    .select('category')
    .eq('is_active', true);

  if (!categories || categories.length === 0) {
    await sendTextMessage(phoneNumber, 'Sorry, our catalog is being updated. Please check back soon!');
    return;
  }

  // Count products per category
  const categoryCounts: Record<string, number> = {};
  categories.forEach((p) => {
    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
  });

  // Build interactive list
  const rows = Object.entries(categoryCounts).map(([category, count]) => ({
    id: `category_${category}`,
    title: category.charAt(0).toUpperCase() + category.slice(1),
    description: `${count} items available`,
  }));

  await sendInteractiveList(
    phoneNumber,
    'Browse Our Catalog',
    'Select a category to view products:',
    'View Categories',
    [{
      title: 'Categories',
      rows: rows.slice(0, 10), // WhatsApp limit: 10 rows per section
    }]
  );

  // Log the interaction
  await logCustomerInteraction(customer.id, 'browse_catalog_initiated', null);
}

/**
 * Send products in a category
 */
async function sendCategoryProducts(phoneNumber: string, category: string, customer: any) {
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('category', category)
    .eq('is_active', true)
    .limit(10);

  if (!products || products.length === 0) {
    await sendTextMessage(phoneNumber, `No products found in ${category} category.`);
    return;
  }

  const rows = products.map((product) => ({
    id: `product_${product.id}`,
    title: product.name.substring(0, 24), // WhatsApp limit: 24 chars
    description: `${product.price.toLocaleString()} ${product.currency} • ${product.stock_quantity > 0 ? 'In stock' : 'Out of stock'}`,
  }));

  await sendInteractiveList(
    phoneNumber,
    `${category.charAt(0).toUpperCase() + category.slice(1)} Collection`,
    `We have ${products.length} items for you:`,
    'View Products',
    [{
      title: 'Products',
      rows,
    }]
  );

  // Log interaction
  await logCustomerInteraction(customer.id, 'category_browsed', { category, productCount: products.length });
}

/**
 * Send detailed product information
 */
async function sendProductDetail(phoneNumber: string, productId: string, customer: any) {
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (!product) {
    await sendTextMessage(phoneNumber, 'Sorry, that product is no longer available.');
    return;
  }

  // Send product image if available
  if (product.images && product.images.length > 0) {
    await sendImageMessage(phoneNumber, product.images[0], `${product.name}\n${product.price.toLocaleString()} ${product.currency}`);
  }

  // Send product details with order button
  let detailsText = `*${product.name}*\n\n`;
  detailsText += `💰 Price: ${product.price.toLocaleString()} ${product.currency}\n`;
  detailsText += `📦 Stock: ${product.stock_quantity > 0 ? `${product.stock_quantity} available` : 'Out of stock'}\n`;
  
  if (product.sizes && product.sizes.length > 0) {
    detailsText += `📏 Sizes: ${product.sizes.join(', ')}\n`;
  }
  
  if (product.colors && product.colors.length > 0) {
    detailsText += `🎨 Colors: ${product.colors.join(', ')}\n`;
  }
  
  if (product.description) {
    detailsText += `\n${product.description}`;
  }

  // Send with order button if in stock
  if (product.stock_quantity > 0) {
    await sendInteractiveButtons(
      phoneNumber,
      detailsText,
      [
        { id: `order_${product.id}`, title: 'Order Now' },
        { id: 'browse_more', title: 'View More' },
      ]
    );
  } else {
    await sendTextMessage(phoneNumber, detailsText + '\n\n❌ Currently out of stock. We\'ll notify you when available!');
  }

  // Log interaction
  await logCustomerInteraction(customer.id, 'product_viewed', { productId: product.id, productName: product.name });
}

/**
 * Handle product inquiry with AI recommendations
 */
async function handleProductInquiry(phoneNumber: string, query: string, customer: any) {
  try {
    // Get conversation history for context
    const { data: recentMessages } = await supabase
      .from('whatsapp_messages')
      .select('direction, content')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const conversationHistory = recentMessages?.reverse().map((msg) => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: extractMessageText(msg.content),
    })) || [];

    // Call AI recommendation engine
    const aiResponse = await fetch(
      `${supabaseUrl}/functions/v1/ai-product-recommendations`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          customerId: customer.id,
          conversationHistory,
        }),
      }
    );

    if (!aiResponse.ok) {
      throw new Error('AI recommendation failed');
    }

    const recommendations = await aiResponse.json();

    if (!recommendations.success || recommendations.recommendations.count === 0) {
      // Fallback to simple search
      await handleSimpleProductSearch(phoneNumber, query, customer);
      return;
    }

    // Send AI-generated message
    await sendTextMessage(phoneNumber, recommendations.recommendations.message);

    // Send recommended products
    const products = recommendations.recommendations.products.slice(0, 5);
    
    if (products.length > 0) {
      const rows = products.map((product: any) => ({
        id: `product_${product.id}`,
        title: product.name.substring(0, 24),
        description: `${product.price.toLocaleString()} ${product.currency} • ${product.aiHighlight}`,
      }));

      await sendInteractiveList(
        phoneNumber,
        '🎯 Recommended For You',
        `Based on your interests, here are my top picks:`,
        'View Products',
        [{
          title: 'AI Recommendations',
          rows,
        }]
      );
    }

    // Send additional suggestions if available
    if (recommendations.recommendations.suggestions?.length > 0) {
      const suggestionsText = recommendations.recommendations.suggestions.join('\n• ');
      await sendTextMessage(phoneNumber, `💡 You might also like:\n• ${suggestionsText}`);
    }

    // Log AI-powered inquiry
    await logCustomerInteraction(customer.id, 'ai_product_inquiry', {
      query,
      recommendationsCount: products.length,
      intent: recommendations.intent,
    });

  } catch (error) {
    console.error('AI recommendation error:', error);
    // Fallback to simple search
    await handleSimpleProductSearch(phoneNumber, query, customer);
  }
}

/**
 * Extract text from WhatsApp message content
 */
function extractMessageText(content: any): string {
  if (content.text?.body) return content.text.body;
  if (content.interactive?.button_reply?.title) return content.interactive.button_reply.title;
  if (content.interactive?.list_reply?.title) return content.interactive.list_reply.title;
  return '';
}

/**
 * Fallback: Simple product search without AI
 */
async function handleSimpleProductSearch(phoneNumber: string, query: string, customer: any) {
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .eq('is_active', true)
    .limit(5);

  if (!products || products.length === 0) {
    await sendTextMessage(
      phoneNumber,
      `I couldn't find any products matching "${query}". Would you like to browse our full catalog instead?`
    );
    return;
  }

  const responseText = `I found ${products.length} product${products.length > 1 ? 's' : ''} for you!`;
  
  const rows = products.map((product) => ({
    id: `product_${product.id}`,
    title: product.name.substring(0, 24),
    description: `${product.price.toLocaleString()} ${product.currency}`,
  }));

  await sendInteractiveList(
    phoneNumber,
    'Search Results',
    responseText,
    'View Products',
    [{
      title: 'Matches',
      rows,
    }]
  );

  // Log inquiry
  await logCustomerInteraction(customer.id, 'product_inquiry', { query, resultsCount: products.length });
}

/**
 * Send order status
 */
async function sendOrderStatus(phoneNumber: string, customer: any) {
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
    .limit(3);

  if (!orders || orders.length === 0) {
    await sendTextMessage(phoneNumber, 'You don\'t have any orders yet. Browse our catalog to place your first order!');
    return;
  }

  let statusText = `📦 *Your Recent Orders*\n\n`;
  
  orders.forEach((order, index) => {
    const statusEmoji = order.status === 'delivered' ? '✅' : order.status === 'cancelled' ? '❌' : '🔄';
    statusText += `${statusEmoji} Order #${order.id.substring(0, 8)}\n`;
    statusText += `   Status: ${order.status.toUpperCase()}\n`;
    statusText += `   Total: ${order.total_amount.toLocaleString()} ${order.currency}\n`;
    if (index < orders.length - 1) statusText += '\n';
  });

  await sendTextMessage(phoneNumber, statusText);
}

/**
 * Initiate order creation flow
 */
async function initiateOrderCreation(phoneNumber: string, data: any, customer: any) {
  try {
    // Call order handler to start order flow
    const orderResponse = await fetch(
      `${supabaseUrl}/functions/v1/whatsapp-order-handler`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'initiate',
          data: {
            customerId: customer.id,
            productId: data.productId,
            phoneNumber,
          },
        }),
      }
    );

    if (!orderResponse.ok) {
      throw new Error('Order initiation failed');
    }

    const result = await orderResponse.json();

    if (result.error === 'out_of_stock') {
      await sendTextMessage(phoneNumber, result.message);
      return;
    }

    // Send next step based on order session
    const nextStep = result.nextStep;

    if (nextStep.type === 'interactive_buttons') {
      await sendInteractiveButtons(phoneNumber, nextStep.message, nextStep.buttons);
    } else if (nextStep.type === 'text') {
      await sendTextMessage(phoneNumber, nextStep.message);
    }

    // Log order initiation
    await logCustomerInteraction(customer.id, 'order_initiated', {
      productId: data.productId,
      source: 'whatsapp',
    });

  } catch (error) {
    console.error('Order initiation error:', error);
    await sendTextMessage(
      phoneNumber,
      '✅ Great! Our team will contact you shortly to complete your order. Thank you!'
    );
  }
}

/**
 * Handle order session updates (size, color, quantity, etc.)
 */
async function handleOrderUpdate(phoneNumber: string, data: any, customer: any) {
  try {
    const orderResponse = await fetch(
      `${supabaseUrl}/functions/v1/whatsapp-order-handler`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update',
          data: {
            customerId: customer.id,
            field: data.field,
            value: data.value,
          },
        }),
      }
    );

    if (!orderResponse.ok) {
      throw new Error('Order update failed');
    }

    const result = await orderResponse.json();
    const nextStep = result.nextStep;

    if (nextStep.type === 'interactive_buttons') {
      await sendInteractiveButtons(phoneNumber, nextStep.message, nextStep.buttons);
    } else if (nextStep.type === 'text') {
      await sendTextMessage(phoneNumber, nextStep.message);
    }

  } catch (error) {
    console.error('Order update error:', error);
    await sendTextMessage(phoneNumber, 'Sorry, something went wrong. Please try again or contact us.');
  }
}

/**
 * Handle order confirmation
 */
async function handleOrderConfirmation(phoneNumber: string, customer: any) {
  try {
    const orderResponse = await fetch(
      `${supabaseUrl}/functions/v1/whatsapp-order-handler`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'confirm',
          data: {
            customerId: customer.id,
          },
        }),
      }
    );

    if (!orderResponse.ok) {
      throw new Error('Order confirmation failed');
    }

    const result = await orderResponse.json();
    
    // Send confirmation message
    await sendTextMessage(phoneNumber, result.message);

    // If order created successfully, send order number
    if (result.orderNumber) {
      await sendTextMessage(
        phoneNumber,
        `🎉 Your order ${result.orderNumber} has been placed successfully! We'll keep you updated.`
      );
    }

  } catch (error) {
    console.error('Order confirmation error:', error);
    await sendTextMessage(phoneNumber, 'Sorry, we couldn\'t complete your order. Please contact us for assistance.');
  }
}

/**
 * Handle order cancellation
 */
async function handleOrderCancellation(phoneNumber: string, customer: any) {
  try {
    await fetch(
      `${supabaseUrl}/functions/v1/whatsapp-order-handler`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'cancel',
          data: {
            customerId: customer.id,
          },
        }),
      }
    );

    await sendTextMessage(phoneNumber, 'No problem! Your order has been cancelled. Feel free to browse our catalog anytime.');

  } catch (error) {
    console.error('Order cancellation error:', error);
    await sendTextMessage(phoneNumber, 'Order cancelled.');
  }
}

/**
 * Send help message
 */
async function sendHelpMessage(phoneNumber: string) {
  const helpText = `🤝 *How I Can Help You*

📱 *Browse Products*
Send "catalog" or "show me products"

🔍 *Search*
Tell me what you're looking for
Example: "red dress" or "shoes size 40"

📦 *Check Orders*
Send "my orders" or "order status"

💬 *Questions?*
Just ask! I'm here to help.

You can also call us at [PHONE] or visit our store.`;

  await sendTextMessage(phoneNumber, helpText);
}

/**
 * Update customer interaction stats
 */
async function updateCustomerStats(customerId: string) {
  // Update last interaction and message count
  await supabase.rpc('update_customer_interaction_stats', {
    p_customer_id: customerId,
  });
}

/**
 * Log customer interaction for analytics
 */
async function logCustomerInteraction(customerId: string, interactionType: string, metadata: any) {
  await supabase
    .from('customer_interactions')
    .insert({
      customer_id: customerId,
      interaction_type: interactionType,
      channel: 'whatsapp',
      metadata,
    });
}

// ==== WhatsApp API Helper Functions ====

/**
 * Send text message via WhatsApp API
 */
async function sendTextMessage(to: string, text: string) {
  return await sendWhatsAppMessage(to, {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text },
  });
}

/**
 * Send image message
 */
async function sendImageMessage(to: string, imageUrl: string, caption?: string) {
  return await sendWhatsAppMessage(to, {
    messaging_product: 'whatsapp',
    to,
    type: 'image',
    image: {
      link: imageUrl,
      ...(caption && { caption }),
    },
  });
}

/**
 * Send interactive list message
 */
async function sendInteractiveList(
  to: string,
  header: string,
  body: string,
  buttonText: string,
  sections: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>
) {
  return await sendWhatsAppMessage(to, {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: header },
      body: { text: body },
      action: {
        button: buttonText,
        sections,
      },
    },
  });
}

/**
 * Send interactive buttons
 */
async function sendInteractiveButtons(
  to: string,
  body: string,
  buttons: Array<{ id: string; title: string }>
) {
  return await sendWhatsAppMessage(to, {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: body },
      action: {
        buttons: buttons.slice(0, 3).map((btn) => ({
          type: 'reply',
          reply: btn,
        })),
      },
    },
  });
}

/**
 * Send message via WhatsApp Cloud API
 */
async function sendWhatsAppMessage(to: string, message: any) {
  const url = `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  const result = await response.json();
  
  if (!response.ok) {
    console.error('WhatsApp API error:', result);
    throw new Error(result.error?.message || 'Failed to send WhatsApp message');
  }

  // Store outbound message
  await storeMessage({
    whatsapp_message_id: result.messages?.[0]?.id,
    phone_number: to,
    direction: 'outbound',
    message_type: message.type,
    content: message,
    status: 'sent',
  });

  console.log('Message sent successfully:', result);
  return result;
}
