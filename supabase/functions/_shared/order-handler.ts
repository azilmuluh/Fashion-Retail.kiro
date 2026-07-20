/**
 * Order Management Handler for WhatsApp
 * Handles order creation, confirmation, and tracking
 */

import {
  createTextMessage,
  createButtonMessage,
  createListMessage,
  sendWhatsAppMessage,
  type WhatsAppConfig,
} from './whatsapp.ts';
import { awardPointsForPurchase } from './loyalty-handler.ts';

export interface OrderContext {
  supabase: any;
  whatsappConfig: WhatsAppConfig;
  retailerId: string;
  customerId: string;
  customerPhone: string;
}

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  selectedSize?: string;
  selectedColor?: string;
}

interface OrderSession {
  items: OrderItem[];
  deliveryAddress?: string;
  deliveryNotes?: string;
  step: 'selecting' | 'confirming_items' | 'delivery_info' | 'payment_info' | 'complete';
}

// In-memory order sessions (in production, use Redis or database)
const orderSessions = new Map<string, OrderSession>();

/**
 * Handle order-related interactions
 */
export async function handleOrderMessage(
  context: OrderContext,
  messageText: string,
  payload?: string
): Promise<void> {
  // Handle order button from product details
  if (payload && payload.startsWith('order_')) {
    const productId = payload.replace('order_', '');
    await startOrderFlow(context, productId);
    return;
  }

  // Handle quantity selection
  if (payload && payload.startsWith('qty_')) {
    await handleQuantitySelection(context, payload);
    return;
  }

  // Handle size selection
  if (payload && payload.startsWith('size_')) {
    await handleSizeSelection(context, payload);
    return;
  }

  // Handle color selection
  if (payload && payload.startsWith('color_')) {
    await handleColorSelection(context, payload);
    return;
  }

  // Confirm order
  if (payload === 'confirm_order') {
    await confirmOrder(context);
    return;
  }

  // Cancel order
  if (payload === 'cancel_order') {
    await cancelOrder(context);
    return;
  }

  // View my orders
  if (
    messageText.toLowerCase().includes('my orders') ||
    messageText.toLowerCase().includes('order status') ||
    payload === 'view_orders'
  ) {
    await showCustomerOrders(context);
    return;
  }

  // Handle delivery address input
  const session = orderSessions.get(context.customerId);
  if (session && session.step === 'delivery_info') {
    await handleDeliveryInfo(context, messageText);
    return;
  }
}

/**
 * Start order flow for a product
 */
async function startOrderFlow(context: OrderContext, productId: string): Promise<void> {
  try {
    // Fetch product details
    const { data: product, error } = await context.supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('retailer_id', context.retailerId)
      .single();

    if (error || !product) {
      await sendMessage(
        context,
        createTextMessage(context.customerPhone, '❌ Product not found or unavailable.')
      );
      return;
    }

    // Check stock
    if (product.stock_quantity < 1) {
      await sendMessage(
        context,
        createTextMessage(
          context.customerPhone,
          '😔 Sorry, this item is currently out of stock.'
        )
      );
      return;
    }

    // Create order session
    const session: OrderSession = {
      items: [],
      step: 'selecting',
    };
    orderSessions.set(context.customerId, session);

    // Ask for quantity
    await askForQuantity(context, product);
  } catch (error) {
    console.error('Error starting order flow:', error);
    await sendErrorMessage(context);
  }
}

/**
 * Ask customer for quantity
 */
async function askForQuantity(context: OrderContext, product: any): Promise<void> {
  const maxQty = Math.min(product.stock_quantity, 5);
  const buttons = [];

  for (let i = 1; i <= maxQty; i++) {
    buttons.push({
      id: `qty_${product.id}_${i}`,
      title: `${i} ${i === 1 ? 'item' : 'items'}`,
    });
  }

  const message = createButtonMessage(
    context.customerPhone,
    `🛒 *${product.name}*\n💰 ${formatPrice(product.price)} XAF\n📦 ${product.stock_quantity} available\n\nHow many would you like?`,
    buttons.slice(0, 3) // Max 3 buttons
  );

  await sendMessage(context, message);
}

/**
 * Handle quantity selection
 */
async function handleQuantitySelection(context: OrderContext, payload: string): Promise<void> {
  try {
    const parts = payload.split('_'); // qty_productId_quantity
    const productId = parts[1];
    const quantity = parseInt(parts[2]);

    const { data: product } = await context.supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (!product) return;

    const session = orderSessions.get(context.customerId);
    if (!session) return;

    // Add item to session
    session.items.push({
      productId: product.id,
      productName: product.name,
      quantity,
      price: product.price,
    });

    // Check if product has variants
    const hasSizes = product.sizes && product.sizes.length > 0;
    const hasColors = product.colors && product.colors.length > 0;

    if (hasSizes) {
      await askForSize(context, product, quantity);
    } else if (hasColors) {
      await askForColor(context, product, quantity);
    } else {
      await askForDeliveryInfo(context);
    }
  } catch (error) {
    console.error('Error handling quantity:', error);
    await sendErrorMessage(context);
  }
}

/**
 * Ask for size selection
 */
async function askForSize(context: OrderContext, product: any, quantity: number): Promise<void> {
  const rows = product.sizes.slice(0, 10).map((size: string) => ({
    id: `size_${product.id}_${size}`,
    title: size,
    description: `${quantity} x ${product.name}`,
  }));

  const message = createListMessage(
    context.customerPhone,
    `👕 Select your size for:\n*${product.name}*`,
    'Choose Size',
    [{ title: 'Available Sizes', rows }]
  );

  await sendMessage(context, message);
}

/**
 * Handle size selection
 */
async function handleSizeSelection(context: OrderContext, payload: string): Promise<void> {
  const parts = payload.split('_'); // size_productId_size
  const productId = parts[1];
  const size = parts.slice(2).join('_');

  const session = orderSessions.get(context.customerId);
  if (!session || session.items.length === 0) return;

  const item = session.items.find((i) => i.productId === productId);
  if (item) {
    item.selectedSize = size;
  }

  const { data: product } = await context.supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (product && product.colors && product.colors.length > 0) {
    await askForColor(context, product, item?.quantity || 1);
  } else {
    await askForDeliveryInfo(context);
  }
}

/**
 * Ask for color selection
 */
async function askForColor(context: OrderContext, product: any, quantity: number): Promise<void> {
  const rows = product.colors.slice(0, 10).map((color: string) => ({
    id: `color_${product.id}_${color}`,
    title: color,
    description: `${quantity} x ${product.name}`,
  }));

  const message = createListMessage(
    context.customerPhone,
    `🎨 Select your color for:\n*${product.name}*`,
    'Choose Color',
    [{ title: 'Available Colors', rows }]
  );

  await sendMessage(context, message);
}

/**
 * Handle color selection
 */
async function handleColorSelection(context: OrderContext, payload: string): Promise<void> {
  const parts = payload.split('_'); // color_productId_color
  const productId = parts[1];
  const color = parts.slice(2).join('_');

  const session = orderSessions.get(context.customerId);
  if (!session || session.items.length === 0) return;

  const item = session.items.find((i) => i.productId === productId);
  if (item) {
    item.selectedColor = color;
  }

  await askForDeliveryInfo(context);
}

/**
 * Ask for delivery information
 */
async function askForDeliveryInfo(context: OrderContext): Promise<void> {
  const session = orderSessions.get(context.customerId);
  if (!session) return;

  session.step = 'delivery_info';

  const message = createTextMessage(
    context.customerPhone,
    `📍 *DELIVERY ADDRESS*\n\nPlease provide your delivery address:\n\nExample:\n123 Main Street, Douala, Cameroon\n\nOr reply "SKIP" if you prefer pickup.`
  );

  await sendMessage(context, message);
}

/**
 * Handle delivery info input
 */
async function handleDeliveryInfo(context: OrderContext, address: string): Promise<void> {
  const session = orderSessions.get(context.customerId);
  if (!session) return;

  if (address.toLowerCase() === 'skip') {
    session.deliveryAddress = 'PICKUP';
  } else {
    session.deliveryAddress = address;
  }

  await showOrderSummary(context);
}

/**
 * Show order summary and ask for confirmation
 */
async function showOrderSummary(context: OrderContext): Promise<void> {
  const session = orderSessions.get(context.customerId);
  if (!session) return;

  let summary = '🛒 *ORDER SUMMARY*\n\n';

  let subtotal = 0;
  session.items.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;

    summary += `${index + 1}. ${item.productName}\n`;
    summary += `   Qty: ${item.quantity} x ${formatPrice(item.price)} XAF\n`;
    if (item.selectedSize) summary += `   Size: ${item.selectedSize}\n`;
    if (item.selectedColor) summary += `   Color: ${item.selectedColor}\n`;
    summary += `   Total: ${formatPrice(itemTotal)} XAF\n\n`;
  });

  summary += `💰 *TOTAL: ${formatPrice(subtotal)} XAF*\n\n`;
  summary += `📍 Delivery: ${session.deliveryAddress || 'Not specified'}\n\n`;
  summary += `📱 *PAYMENT INSTRUCTIONS*\nPay via Mobile Money and reply with confirmation.`;

  const message = createButtonMessage(context.customerPhone, summary, [
    { id: 'confirm_order', title: '✅ Confirm Order' },
    { id: 'cancel_order', title: '❌ Cancel' },
  ]);

  await sendMessage(context, message);
}

/**
 * Confirm and create order
 */
async function confirmOrder(context: OrderContext): Promise<void> {
  try {
    const session = orderSessions.get(context.customerId);
    if (!session) return;

    // Calculate totals
    const subtotal = session.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const deliveryFee = session.deliveryAddress === 'PICKUP' ? 0 : 1000; // 1000 XAF delivery
    const total = subtotal + deliveryFee;

    // Create order
    const { data: order, error: orderError } = await context.supabase
      .from('orders')
      .insert({
        retailer_id: context.retailerId,
        customer_id: context.customerId,
        status: 'pending',
        payment_status: 'pending',
        total_amount: total,
        delivery_address: session.deliveryAddress !== 'PICKUP' ? session.deliveryAddress : null,
        delivery_method: session.deliveryAddress === 'PICKUP' ? 'pickup' : 'delivery',
        notes: session.deliveryNotes,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const orderItems = session.items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity,
      selected_size: item.selectedSize,
      selected_color: item.selectedColor,
    }));

    const { error: itemsError } = await context.supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    // Update product stock
    for (const item of session.items) {
      await context.supabase.rpc('decrement_stock', {
        product_id: item.productId,
        quantity: item.quantity,
      });
    }

    // Clear session
    orderSessions.delete(context.customerId);

    // Award loyalty points
    await awardPointsForPurchase(context, total, order.id);

    // Send confirmation
    let confirmation = `✅ *ORDER CONFIRMED!*\n\n`;
    confirmation += `Order #: ${order.id.substring(0, 8).toUpperCase()}\n`;
    confirmation += `Total: ${formatPrice(total)} XAF\n\n`;
    confirmation += `📱 *PAYMENT INSTRUCTIONS*\n`;
    confirmation += `MTN Mobile Money: +237 XXX XXX XXX\n`;
    confirmation += `Orange Money: +237 XXX XXX XXX\n\n`;
    confirmation += `Please send payment and reply with:\n"PAID [transaction_id]"\n\n`;
    confirmation += `We'll confirm and process your order!`;

    await sendMessage(context, createTextMessage(context.customerPhone, confirmation));
  } catch (error) {
    console.error('Error confirming order:', error);
    await sendErrorMessage(context);
  }
}

/**
 * Cancel order
 */
async function cancelOrder(context: OrderContext): Promise<void> {
  orderSessions.delete(context.customerId);

  const message = createTextMessage(
    context.customerPhone,
    '❌ Order cancelled.\n\nFeel free to browse again anytime!'
  );

  await sendMessage(context, message);
}

/**
 * Show customer's orders
 */
async function showCustomerOrders(context: OrderContext): Promise<void> {
  try {
    const { data: orders, error } = await context.supabase
      .from('orders')
      .select(`
        id,
        created_at,
        status,
        payment_status,
        total_amount,
        order_items (
          id,
          product:products (name)
        )
      `)
      .eq('customer_id', context.customerId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    if (!orders || orders.length === 0) {
      await sendMessage(
        context,
        createTextMessage(
          context.customerPhone,
          '📦 No orders yet.\n\nStart shopping to place your first order!'
        )
      );
      return;
    }

    let ordersList = '📦 *YOUR ORDERS*\n\n';

    orders.forEach((order: any) => {
      const orderNum = order.id.substring(0, 8).toUpperCase();
      const date = new Date(order.created_at).toLocaleDateString();
      const statusEmoji = getStatusEmoji(order.status);

      ordersList += `Order #${orderNum}\n`;
      ordersList += `${statusEmoji} ${order.status.toUpperCase()}\n`;
      ordersList += `💰 ${formatPrice(order.total_amount)} XAF\n`;
      ordersList += `📅 ${date}\n\n`;
    });

    await sendMessage(context, createTextMessage(context.customerPhone, ordersList));
  } catch (error) {
    console.error('Error fetching orders:', error);
    await sendErrorMessage(context);
  }
}

/**
 * Get status emoji
 */
function getStatusEmoji(status: string): string {
  const emojis: Record<string, string> = {
    pending: '⏳',
    confirmed: '✅',
    processing: '📦',
    fulfilled: '🚚',
    delivered: '✨',
    cancelled: '❌',
  };
  return emojis[status] || '📋';
}

/**
 * Send error message
 */
async function sendErrorMessage(context: OrderContext): Promise<void> {
  const message = createTextMessage(
    context.customerPhone,
    '⚠️ Sorry, something went wrong. Please try again or contact support.'
  );
  await sendMessage(context, message);
}

/**
 * Helper to send message and store in database
 */
async function sendMessage(context: OrderContext, message: any): Promise<void> {
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
      is_order_related: true,
    },
  });
}

/**
 * Format price with thousands separator
 */
function formatPrice(price: number): string {
  return price.toLocaleString('en-US');
}
