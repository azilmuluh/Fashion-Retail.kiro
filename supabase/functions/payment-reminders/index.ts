/**
 * Payment Reminder & Tracking System
 * 
 * Automates payment reminders for:
 * - Pending payments (Cash on Delivery, incomplete mobile money)
 * - Overdue invoices
 * - Payment confirmations
 * - Payment status tracking
 * 
 * Solves: Cash flow problems from delayed/missed payments
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    let result;

    switch (action) {
      case 'send-reminders':
        result = await sendPaymentReminders(req);
        break;
      case 'pending-payments':
        result = await getPendingPayments(req);
        break;
      case 'overdue-payments':
        result = await getOverduePayments(req);
        break;
      case 'payment-history':
        result = await getPaymentHistory(req);
        break;
      case 'send-custom-reminder':
        result = await sendCustomReminder(req);
        break;
      default:
        throw new Error('Invalid endpoint');
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Payment reminder error:', error);
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
 * Send automated payment reminders
 */
async function sendPaymentReminders(req: Request) {
  const { retailerId } = await req.json();

  if (!retailerId) {
    throw new Error('Retailer ID required');
  }

  // Get orders with pending payments
  const { data: pendingOrders } = await supabase
    .from('orders')
    .select('*, customers(name, phone_number)')
    .eq('retailer_id', retailerId)
    .eq('payment_status', 'pending')
    .in('status', ['pending', 'confirmed', 'processing'])
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
    .order('created_at', { ascending: true })
    .limit(50);

  if (!pendingOrders || pendingOrders.length === 0) {
    return { remindersSent: 0, message: 'No pending payments found' };
  }

  let sentCount = 0;
  const remindersSent = [];

  for (const order of pendingOrders) {
    const customer = order.customers;
    const daysSinceOrder = Math.floor(
      (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Check if reminder was already sent recently
    const { data: recentReminders } = await supabase
      .from('customer_interactions')
      .select('created_at')
      .eq('customer_id', order.customer_id)
      .eq('interaction_type', 'payment_reminder')
      .like('metadata', `%${order.order_number}%`)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (recentReminders && recentReminders.length > 0) {
      continue; // Skip if reminded in last 24 hours
    }

    // Determine reminder urgency
    let urgency = 'gentle';
    let reminderMessage = '';

    if (daysSinceOrder === 0) {
      // Same day - skip reminders for now
      continue;
    } else if (daysSinceOrder === 1) {
      urgency = 'gentle';
      reminderMessage = generateGentleReminder(order, customer);
    } else if (daysSinceOrder >= 2 && daysSinceOrder <= 4) {
      urgency = 'moderate';
      reminderMessage = generateModerateReminder(order, customer, daysSinceOrder);
    } else if (daysSinceOrder >= 5) {
      urgency = 'urgent';
      reminderMessage = generateUrgentReminder(order, customer, daysSinceOrder);
    }

    if (!reminderMessage) continue;

    // Send WhatsApp reminder
    const sent = await sendWhatsAppMessage(customer.phone_number, reminderMessage);

    if (sent) {
      // Log reminder
      await supabase.from('customer_interactions').insert({
        customer_id: order.customer_id,
        interaction_type: 'payment_reminder',
        channel: 'whatsapp',
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          amount: order.total_amount,
          days_since_order: daysSinceOrder,
          urgency,
        },
      });

      remindersSent.push({
        orderId: order.id,
        orderNumber: order.order_number,
        customerName: customer.name,
        amount: order.total_amount,
        daysSinceOrder,
        urgency,
      });

      sentCount++;
    }
  }

  return {
    remindersSent: sentCount,
    reminders: remindersSent,
    totalPendingPayments: pendingOrders.length,
  };
}

/**
 * Generate gentle reminder (Day 1)
 */
function generateGentleReminder(order: any, customer: any): string {
  let message = `Hi ${customer.name}! 👋\n\n`;
  message += `Thank you for your order #${order.order_number}!\n\n`;
  message += `💰 Payment: ${order.total_amount.toLocaleString()} ${order.currency}\n`;
  message += `📦 Status: ${order.status.toUpperCase()}\n\n`;

  if (order.payment_method === 'cash') {
    message += `Payment Method: Cash on Delivery\n\n`;
    message += `We'll contact you to arrange delivery. Please have the exact amount ready. 🙏\n\n`;
  } else if (order.payment_method === 'mtn' || order.payment_method === 'orange') {
    message += `Payment Method: ${order.payment_method.toUpperCase()} Mobile Money\n\n`;
    message += `We're still waiting for your payment confirmation.\n\n`;
    message += `Please complete the payment on your phone to proceed with your order. 📱\n\n`;
  }

  message += `Questions? Reply anytime!`;

  return message;
}

/**
 * Generate moderate reminder (Days 2-4)
 */
function generateModerateReminder(order: any, customer: any, daysSince: number): string {
  let message = `Hi ${customer.name},\n\n`;
  message += `Quick reminder about your order #${order.order_number} 📦\n\n`;
  message += `💰 Amount Due: ${order.total_amount.toLocaleString()} ${order.currency}\n`;
  message += `⏰ Ordered: ${daysSince} day${daysSince > 1 ? 's' : ''} ago\n\n`;

  if (order.payment_method === 'cash') {
    message += `Payment: Cash on Delivery\n\n`;
    message += `Let us know when you're ready to receive your order! We want to make sure it gets to you soon. 😊\n\n`;
  } else {
    message += `We haven't received your ${order.payment_method.toUpperCase()} payment yet.\n\n`;
    message += `⚠️ Your order will be held for ${Math.max(0, 7 - daysSince)} more day${7 - daysSince !== 1 ? 's' : ''} before cancellation.\n\n`;
    message += `Please complete payment to secure your items!\n\n`;
  }

  message += `Reply "help" if you need assistance.`;

  return message;
}

/**
 * Generate urgent reminder (Day 5+)
 */
function generateUrgentReminder(order: any, customer: any, daysSince: number): string {
  let message = `⚠️ URGENT REMINDER ⚠️\n\n`;
  message += `Hi ${customer.name},\n\n`;
  message += `Your order #${order.order_number} is about to be cancelled due to pending payment.\n\n`;
  message += `💰 Amount: ${order.total_amount.toLocaleString()} ${order.currency}\n`;
  message += `⏰ ${daysSince} days without payment\n\n`;

  if (order.payment_method === 'cash') {
    message += `We've been trying to deliver your order but haven't heard back.\n\n`;
    message += `❗ This is your final reminder. Please confirm if you still want this order.\n\n`;
    message += `Reply YES to confirm or the order will be cancelled.\n\n`;
  } else {
    message += `❗ Final reminder: Complete payment within 24 hours or your order will be automatically cancelled.\n\n`;
    message += `We've reserved these items for you, but we need payment to proceed.\n\n`;
  }

  message += `Need help? Call us at [PHONE] or reply here.`;

  return message;
}

/**
 * Get pending payments dashboard
 */
async function getPendingPayments(req: Request) {
  const authHeader = req.headers.get('authorization');
  // In production, extract retailer ID from JWT
  const { data: retailer } = await supabase
    .from('retailers')
    .select('id')
    .limit(1)
    .single();

  if (!retailer) {
    throw new Error('Retailer not found');
  }

  const retailerId = retailer.id;

  // Get all pending payments
  const { data: pendingOrders } = await supabase
    .from('orders')
    .select('*, customers(name, phone_number), order_items(*, products(name))')
    .eq('retailer_id', retailerId)
    .eq('payment_status', 'pending')
    .in('status', ['pending', 'confirmed', 'processing'])
    .order('created_at', { ascending: true });

  if (!pendingOrders) {
    return { pendingPayments: [], totalAmount: 0, count: 0 };
  }

  // Calculate totals
  const totalAmount = pendingOrders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);

  // Group by age
  const now = Date.now();
  const grouped = {
    today: pendingOrders.filter(
      (o) => now - new Date(o.created_at).getTime() < 24 * 60 * 60 * 1000
    ),
    yesterday: pendingOrders.filter(
      (o) =>
        now - new Date(o.created_at).getTime() >= 24 * 60 * 60 * 1000 &&
        now - new Date(o.created_at).getTime() < 48 * 60 * 60 * 1000
    ),
    thisWeek: pendingOrders.filter(
      (o) =>
        now - new Date(o.created_at).getTime() >= 48 * 60 * 60 * 1000 &&
        now - new Date(o.created_at).getTime() < 7 * 24 * 60 * 60 * 1000
    ),
    overdue: pendingOrders.filter(
      (o) => now - new Date(o.created_at).getTime() >= 7 * 24 * 60 * 60 * 1000
    ),
  };

  return {
    pendingPayments: pendingOrders,
    totalAmount,
    count: pendingOrders.length,
    grouped,
    summary: {
      today: grouped.today.length,
      yesterday: grouped.yesterday.length,
      thisWeek: grouped.thisWeek.length,
      overdue: grouped.overdue.length,
    },
  };
}

/**
 * Get overdue payments
 */
async function getOverduePayments(req: Request) {
  const { data: retailer } = await supabase
    .from('retailers')
    .select('id')
    .limit(1)
    .single();

  if (!retailer) {
    throw new Error('Retailer not found');
  }

  const retailerId = retailer.id;

  // Orders older than 7 days with pending payment
  const { data: overdueOrders } = await supabase
    .from('orders')
    .select('*, customers(name, phone_number)')
    .eq('retailer_id', retailerId)
    .eq('payment_status', 'pending')
    .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: true });

  const totalOverdue = overdueOrders?.reduce((sum, o) => sum + parseFloat(o.total_amount), 0) || 0;

  return {
    overduePayments: overdueOrders || [],
    totalOverdue,
    count: overdueOrders?.length || 0,
  };
}

/**
 * Get payment history
 */
async function getPaymentHistory(req: Request) {
  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get('days') || '30');

  const { data: retailer } = await supabase
    .from('retailers')
    .select('id')
    .limit(1)
    .single();

  if (!retailer) {
    throw new Error('Retailer not found');
  }

  const retailerId = retailer.id;

  // Get payment reminders sent
  const { data: reminders } = await supabase
    .from('customer_interactions')
    .select('*, customers(name, phone_number)')
    .eq('interaction_type', 'payment_reminder')
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(100);

  // Get payments received after reminders
  const remindersSent = reminders?.length || 0;
  let paymentsReceived = 0;

  if (reminders) {
    for (const reminder of reminders) {
      const orderId = reminder.metadata?.order_id;
      if (orderId) {
        const { data: order } = await supabase
          .from('orders')
          .select('payment_status')
          .eq('id', orderId)
          .single();

        if (order && order.payment_status === 'paid') {
          paymentsReceived++;
        }
      }
    }
  }

  const conversionRate = remindersSent > 0 ? (paymentsReceived / remindersSent) * 100 : 0;

  return {
    reminders: reminders || [],
    statistics: {
      remindersSent,
      paymentsReceived,
      conversionRate: Math.round(conversionRate * 100) / 100,
      pending: remindersSent - paymentsReceived,
    },
  };
}

/**
 * Send custom payment reminder
 */
async function sendCustomReminder(req: Request) {
  const { orderId, message } = await req.json();

  if (!orderId || !message) {
    throw new Error('Order ID and message required');
  }

  // Get order and customer details
  const { data: order } = await supabase
    .from('orders')
    .select('*, customers(name, phone_number)')
    .eq('id', orderId)
    .single();

  if (!order) {
    throw new Error('Order not found');
  }

  const customer = order.customers;

  // Send custom message
  const sent = await sendWhatsAppMessage(customer.phone_number, message);

  if (sent) {
    // Log custom reminder
    await supabase.from('customer_interactions').insert({
      customer_id: order.customer_id,
      interaction_type: 'payment_reminder',
      channel: 'whatsapp',
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        custom_message: true,
      },
    });
  }

  return {
    sent,
    orderId: order.id,
    orderNumber: order.order_number,
    customerName: customer.name,
  };
}

/**
 * Send WhatsApp message
 */
async function sendWhatsAppMessage(phoneNumber: string, message: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phoneNumber,
          type: 'text',
          text: { body: message },
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return false;
  }
}
