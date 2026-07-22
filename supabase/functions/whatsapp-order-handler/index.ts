/**
 * WhatsApp Order Creation and Payment Handler
 * 
 * Handles the complete order flow through WhatsApp:
 * 1. Product selection → Size/Color selection → Delivery details → Payment
 * 2. Mobile money payment integration (MTN/Orange Money)
 * 3. Order tracking and updates
 * 
 * Solves: "Cannot order via WhatsApp" problem
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface OrderSession {
  customerId: string;
  productId: string;
  productName: string;
  quantity: number;
  size?: string;
  color?: string;
  price: number;
  currency: string;
  deliveryAddress?: string;
  deliveryNotes?: string;
  paymentMethod?: 'mtn' | 'orange' | 'cash';
  phoneNumber: string;
  step: 'size_selection' | 'color_selection' | 'quantity_selection' | 'delivery_details' | 'payment_selection' | 'payment_confirmation';
}

serve(async (req) => {
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
    const { action, data } = await req.json();

    let result;

    switch (action) {
      case 'initiate':
        result = await initiateOrder(data);
        break;
      case 'update':
        result = await updateOrderSession(data);
        break;
      case 'confirm':
        result = await confirmOrder(data);
        break;
      case 'cancel':
        result = await cancelOrderSession(data);
        break;
      case 'get_status':
        result = await getOrderStatus(data);
        break;
      default:
        throw new Error('Invalid action');
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Order handler error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
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
 * Initiate new order session
 */
async function initiateOrder(data: {
  customerId: string;
  productId: string;
  phoneNumber: string;
}) {
  const { customerId, productId, phoneNumber } = data;

  // Get product details
  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (error || !product) {
    throw new Error('Product not found');
  }

  if (product.stock_quantity === 0) {
    return {
      error: 'out_of_stock',
      message: `Sorry, ${product.name} is currently out of stock.`,
      suggestions: ['Browse similar products', 'Get notified when back in stock'],
    };
  }

  // Create order session
  const session: OrderSession = {
    customerId,
    productId: product.id,
    productName: product.name,
    quantity: 1,
    price: product.price,
    currency: product.currency,
    phoneNumber,
    step: product.sizes && product.sizes.length > 0 ? 'size_selection' : 
          product.colors && product.colors.length > 0 ? 'color_selection' : 
          'quantity_selection',
  };

  // Store session (expires in 15 minutes)
  await storeOrderSession(customerId, session);

  // Generate next step response
  return {
    session,
    nextStep: await generateNextStepMessage(session, product),
  };
}

/**
 * Update order session with customer selection
 */
async function updateOrderSession(data: {
  customerId: string;
  field: string;
  value: any;
}) {
  const { customerId, field, value } = data;

  // Get current session
  const session = await getOrderSession(customerId);
  if (!session) {
    throw new Error('Order session expired. Please start a new order.');
  }

  // Update session field
  session[field] = value;

  // Determine next step
  if (field === 'size' || field === 'color') {
    if (session.step === 'size_selection' && session.color === undefined) {
      const { data: product } = await supabase
        .from('products')
        .select('colors')
        .eq('id', session.productId)
        .single();
      
      if (product?.colors && product.colors.length > 0) {
        session.step = 'color_selection';
      } else {
        session.step = 'quantity_selection';
      }
    } else {
      session.step = 'quantity_selection';
    }
  } else if (field === 'quantity') {
    session.step = 'delivery_details';
  } else if (field === 'deliveryAddress') {
    session.step = 'payment_selection';
  } else if (field === 'paymentMethod') {
    session.step = 'payment_confirmation';
  }

  // Store updated session
  await storeOrderSession(customerId, session);

  // Get product for next step
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', session.productId)
    .single();

  return {
    session,
    nextStep: await generateNextStepMessage(session, product),
  };
}

/**
 * Confirm and create the order
 */
async function confirmOrder(data: { customerId: string }) {
  const { customerId } = data;

  // Get session
  const session = await getOrderSession(customerId);
  if (!session) {
    throw new Error('Order session expired');
  }

  // Validate session completeness
  if (!session.deliveryAddress) {
    throw new Error('Delivery address required');
  }

  // Get customer and retailer info
  const { data: customer } = await supabase
    .from('customers')
    .select('*, retailers(*)')
    .eq('id', customerId)
    .single();

  if (!customer) {
    throw new Error('Customer not found');
  }

  // Generate order number
  const orderNumber = await generateOrderNumber(customer.retailer_id);

  // Calculate total
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', session.productId)
    .single();

  if (!product) {
    throw new Error('Product not found');
  }

  const subtotal = product.price * session.quantity;
  const totalAmount = subtotal; // Add delivery fees if needed

  // Create order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      retailer_id: customer.retailer_id,
      customer_id: customerId,
      order_number: orderNumber,
      status: 'pending',
      total_amount: totalAmount,
      currency: session.currency,
      payment_status: session.paymentMethod === 'cash' ? 'pending' : 'pending',
      payment_method: session.paymentMethod,
      delivery_address: session.deliveryAddress,
      delivery_notes: session.deliveryNotes,
      metadata: {
        source: 'whatsapp',
        whatsapp_phone: session.phoneNumber,
        order_session: session,
      },
    })
    .select()
    .single();

  if (orderError) {
    console.error('Order creation error:', orderError);
    throw new Error('Failed to create order');
  }

  // Create order items
  const { error: itemError } = await supabase
    .from('order_items')
    .insert({
      order_id: order.id,
      product_id: session.productId,
      quantity: session.quantity,
      unit_price: product.price,
      subtotal: subtotal,
      size: session.size,
      color: session.color,
    });

  if (itemError) {
    console.error('Order item creation error:', itemError);
    throw new Error('Failed to create order items');
  }

  // Decrement stock
  await supabase.rpc('decrement_stock', {
    product_id: session.productId,
    quantity: session.quantity,
  });

  // Initialize payment if mobile money
  let paymentStatus = null;
  if (session.paymentMethod === 'mtn' || session.paymentMethod === 'orange') {
    paymentStatus = await initiateMobileMoneyPayment({
      orderId: order.id,
      phoneNumber: session.phoneNumber,
      amount: totalAmount,
      currency: session.currency,
      provider: session.paymentMethod,
    });
  }

  // Clear session
  await clearOrderSession(customerId);

  // Log order creation
  await supabase.from('customer_interactions').insert({
    customer_id: customerId,
    interaction_type: 'order_created',
    channel: 'whatsapp',
    metadata: {
      order_id: order.id,
      order_number: orderNumber,
      total_amount: totalAmount,
      payment_method: session.paymentMethod,
    },
  });

  return {
    order,
    orderNumber,
    paymentStatus,
    message: generateOrderConfirmationMessage(order, session, paymentStatus),
  };
}

/**
 * Cancel order session
 */
async function cancelOrderSession(data: { customerId: string }) {
  await clearOrderSession(data.customerId);
  return {
    message: 'Order cancelled. Feel free to browse our catalog or start a new order anytime!',
  };
}

/**
 * Get order status
 */
async function getOrderStatus(data: { orderId?: string; orderNumber?: string }) {
  let query = supabase.from('orders').select('*, order_items(*, products(*)), customers(name, phone_number)');

  if (data.orderId) {
    query = query.eq('id', data.orderId);
  } else if (data.orderNumber) {
    query = query.eq('order_number', data.orderNumber);
  } else {
    throw new Error('Order ID or order number required');
  }

  const { data: order, error } = await query.single();

  if (error || !order) {
    throw new Error('Order not found');
  }

  return {
    order,
    statusMessage: generateOrderStatusMessage(order),
  };
}

// ============= Helper Functions =============

/**
 * Store order session in database (temporary)
 */
async function storeOrderSession(customerId: string, session: OrderSession) {
  await supabase.from('customer_interactions').insert({
    customer_id: customerId,
    interaction_type: 'order_session_update',
    channel: 'whatsapp',
    metadata: {
      session,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
    },
  });
}

/**
 * Get order session
 */
async function getOrderSession(customerId: string): Promise<OrderSession | null> {
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

  // Check if expired
  if (expiresAt < new Date()) {
    return null;
  }

  return session;
}

/**
 * Clear order session
 */
async function clearOrderSession(customerId: string) {
  // Just let it expire naturally (15 minutes)
  // Could also delete from customer_interactions if needed
}

/**
 * Generate order number
 */
async function generateOrderNumber(retailerId: string): Promise<string> {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  // Count today's orders
  const startOfDay = new Date(date.setHours(0, 0, 0, 0)).toISOString();
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('retailer_id', retailerId)
    .gte('created_at', startOfDay);

  const orderNum = ((count || 0) + 1).toString().padStart(4, '0');

  return `ORD${year}${month}${day}${orderNum}`;
}

/**
 * Generate next step message for order flow
 */
async function generateNextStepMessage(session: OrderSession, product: any) {
  switch (session.step) {
    case 'size_selection':
      return {
        type: 'interactive_buttons',
        message: `*${session.productName}*\nPrice: ${session.price.toLocaleString()} ${session.currency}\n\nWhat size would you like?`,
        buttons: product.sizes.slice(0, 3).map((size: string) => ({
          id: `size_${size}`,
          title: size,
        })),
      };

    case 'color_selection':
      return {
        type: 'interactive_buttons',
        message: `Great choice! ${session.size ? `Size: ${session.size}\n` : ''}What color would you prefer?`,
        buttons: product.colors.slice(0, 3).map((color: string) => ({
          id: `color_${color}`,
          title: color,
        })),
      };

    case 'quantity_selection':
      return {
        type: 'text',
        message: `Perfect! ${session.size ? `Size: ${session.size}\n` : ''}${session.color ? `Color: ${session.color}\n` : ''}\nHow many would you like? (Available: ${product.stock_quantity})`,
      };

    case 'delivery_details':
      return {
        type: 'text',
        message: `📦 *Order Summary*\n\nProduct: ${session.productName}\n${session.size ? `Size: ${session.size}\n` : ''}${session.color ? `Color: ${session.color}\n` : ''}Quantity: ${session.quantity}\nPrice: ${(session.price * session.quantity).toLocaleString()} ${session.currency}\n\n✅ Please provide your delivery address:`,
      };

    case 'payment_selection':
      return {
        type: 'interactive_buttons',
        message: `Great! We'll deliver to:\n${session.deliveryAddress}\n\nHow would you like to pay?`,
        buttons: [
          { id: 'payment_mtn', title: 'MTN Money' },
          { id: 'payment_orange', title: 'Orange Money' },
          { id: 'payment_cash', title: 'Cash on Delivery' },
        ],
      };

    case 'payment_confirmation':
      const total = session.price * session.quantity;
      return {
        type: 'interactive_buttons',
        message: `*Final Order Confirmation*\n\n📦 Product: ${session.productName}\n${session.size ? `📏 Size: ${session.size}\n` : ''}${session.color ? `🎨 Color: ${session.color}\n` : ''}📊 Quantity: ${session.quantity}\n💰 Total: ${total.toLocaleString()} ${session.currency}\n📍 Delivery: ${session.deliveryAddress}\n💳 Payment: ${session.paymentMethod?.toUpperCase()}\n\nConfirm your order?`,
        buttons: [
          { id: 'confirm_order', title: 'Confirm Order' },
          { id: 'cancel_order', title: 'Cancel' },
        ],
      };

    default:
      return { type: 'text', message: 'Something went wrong. Please try again.' };
  }
}

/**
 * Initiate mobile money payment
 */
async function initiateMobileMoneyPayment(data: {
  orderId: string;
  phoneNumber: string;
  amount: number;
  currency: string;
  provider: 'mtn' | 'orange';
}) {
  // This is a placeholder - actual implementation depends on payment provider API
  // MTN Mobile Money API: https://momodeveloper.mtn.com/
  // Orange Money API: https://developer.orange.com/

  console.log('Initiating mobile money payment:', data);

  // Store payment request
  await supabase.from('customer_interactions').insert({
    customer_id: null, // Will be linked to order
    interaction_type: 'payment_initiated',
    channel: 'whatsapp',
    metadata: {
      order_id: data.orderId,
      payment_provider: data.provider,
      amount: data.amount,
      currency: data.currency,
      phone_number: data.phoneNumber,
      status: 'pending',
    },
  });

  return {
    status: 'pending',
    message: `Payment request sent to ${data.phoneNumber}. Please check your phone and enter your PIN to complete the payment.`,
    provider: data.provider,
  };
}

/**
 * Generate order confirmation message
 */
function generateOrderConfirmationMessage(
  order: any,
  session: OrderSession,
  paymentStatus: any
) {
  let message = `✅ *Order Confirmed!*\n\n`;
  message += `Order Number: *${order.order_number}*\n`;
  message += `Product: ${session.productName}\n`;
  if (session.size) message += `Size: ${session.size}\n`;
  if (session.color) message += `Color: ${session.color}\n`;
  message += `Quantity: ${session.quantity}\n`;
  message += `Total: ${order.total_amount.toLocaleString()} ${session.currency}\n\n`;
  message += `📍 Delivery Address:\n${session.deliveryAddress}\n\n`;

  if (session.paymentMethod === 'cash') {
    message += `💵 Payment: Cash on Delivery\n\n`;
    message += `We'll call you to confirm delivery time. Thank you for your order!`;
  } else if (paymentStatus) {
    message += `💳 Payment: ${session.paymentMethod?.toUpperCase()} Mobile Money\n`;
    message += `Status: ${paymentStatus.status}\n\n`;
    message += paymentStatus.message;
  }

  message += `\n\n📞 Questions? Reply to this message anytime!`;

  return message;
}

/**
 * Generate order status message
 */
function generateOrderStatusMessage(order: any) {
  const statusEmojis = {
    pending: '⏳',
    confirmed: '✅',
    processing: '📦',
    fulfilled: '🚚',
    delivered: '✅',
    cancelled: '❌',
  };

  let message = `${statusEmojis[order.status]} *Order Status*\n\n`;
  message += `Order #: ${order.order_number}\n`;
  message += `Status: ${order.status.toUpperCase()}\n`;
  message += `Payment: ${order.payment_status.toUpperCase()}\n`;
  message += `Total: ${order.total_amount.toLocaleString()} ${order.currency}\n\n`;

  if (order.order_items && order.order_items.length > 0) {
    message += `*Items:*\n`;
    order.order_items.forEach((item: any) => {
      message += `• ${item.products.name} x${item.quantity}\n`;
    });
    message += '\n';
  }

  message += `Delivery: ${order.delivery_address}\n\n`;

  // Status-specific messages
  if (order.status === 'pending') {
    message += `We're processing your order. You'll be notified when it's ready for delivery.`;
  } else if (order.status === 'confirmed') {
    message += `Your order has been confirmed! We're preparing it now.`;
  } else if (order.status === 'processing') {
    message += `Your order is being packed and will be ready for delivery soon.`;
  } else if (order.status === 'fulfilled') {
    message += `Your order is ready and on its way to you!`;
  } else if (order.status === 'delivered') {
    message += `Your order has been delivered. Thank you for shopping with us!`;
  } else if (order.status === 'cancelled') {
    message += `This order was cancelled. ${order.cancellation_reason || ''}`;
  }

  return message;
}
