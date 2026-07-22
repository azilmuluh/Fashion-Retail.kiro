/**
 * Customer Engagement & Retention Automation
 * 
 * Automates customer engagement campaigns:
 * - Abandoned cart recovery
 * - Win-back inactive customers
 * - Ghost shopper conversion
 * - New product alerts
 * - Loyalty rewards
 * 
 * Solves: "Seasonal fluctuations & dry spells" problem
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
      case 'run_campaign':
        result = await runCampaign(data);
        break;
      case 'send_abandoned_cart':
        result = await sendAbandonedCartReminders(data);
        break;
      case 'send_winback':
        result = await sendWinbackCampaign(data);
        break;
      case 'send_ghost_shopper':
        result = await sendGhostShopperCampaign(data);
        break;
      case 'send_new_product':
        result = await sendNewProductAlert(data);
        break;
      case 'get_campaigns':
        result = await getCampaigns(data);
        break;
      case 'get_performance':
        result = await getCampaignPerformance(data);
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
    console.error('Engagement automation error:', error);
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
 * Run a specific engagement campaign
 */
async function runCampaign(data: { campaignId: string }) {
  const { campaignId } = data;

  // Get campaign details
  const { data: campaign, error } = await supabase
    .from('engagement_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (error || !campaign) {
    throw new Error('Campaign not found');
  }

  // Execute campaign based on type
  let sendCount = 0;

  switch (campaign.campaign_type) {
    case 'abandoned_cart':
      sendCount = await sendAbandonedCartReminders({ retailerId: campaign.retailer_id });
      break;
    case 'win_back_inactive':
      sendCount = await sendWinbackCampaign({ retailerId: campaign.retailer_id });
      break;
    case 'ghost_shopper_reengagement':
      sendCount = await sendGhostShopperCampaign({ retailerId: campaign.retailer_id });
      break;
    default:
      sendCount = await sendGenericCampaign(campaignId);
  }

  return {
    campaignId,
    campaignName: campaign.name,
    messagesSent: sendCount,
    executedAt: new Date().toISOString(),
  };
}

/**
 * Send abandoned cart reminders
 */
async function sendAbandonedCartReminders(data: { retailerId: string }) {
  const { retailerId } = data;

  // Identify abandoned carts
  await supabase.rpc('identify_abandoned_carts', {
    p_retailer_id: retailerId,
  });

  // Get abandoned carts that need reminders
  const { data: carts } = await supabase
    .from('abandoned_carts')
    .select('*, customers(name, phone_number)')
    .eq('retailer_id', retailerId)
    .eq('status', 'abandoned')
    .eq('reminder_sent', false)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
    .limit(50);

  if (!carts || carts.length === 0) {
    return { messagesSent: 0 };
  }

  let sentCount = 0;

  for (const cart of carts) {
    const customer = cart.customers;
    const products = cart.products as Array<any>;
    
    // Build message
    let message = `Hi ${customer.name}! 👋\n\n`;
    message += `You left something in your cart:\n\n`;
    
    products.forEach((product: any) => {
      message += `• ${product.product_name} x${product.quantity} - ${product.price.toLocaleString()} XAF\n`;
    });
    
    message += `\nTotal: ${cart.total_value.toLocaleString()} XAF\n\n`;
    message += `Complete your order now and we'll process it today! 🚀\n\n`;
    message += `Reply "order" to continue where you left off.`;

    // Send WhatsApp message
    const sent = await sendWhatsAppMessage(customer.phone_number, message);

    if (sent) {
      // Update cart status
      await supabase
        .from('abandoned_carts')
        .update({
          reminder_sent: true,
          reminder_sent_at: new Date().toISOString(),
          status: 'reminded',
        })
        .eq('id', cart.id);

      // Log engagement send
      await supabase.from('engagement_sends').insert({
        retailer_id: retailerId,
        customer_id: cart.customer_id,
        campaign_id: null,
        message_content: message,
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: { cart_id: cart.id, cart_value: cart.total_value },
      });

      sentCount++;
    }
  }

  return { messagesSent: sentCount };
}

/**
 * Send win-back campaign to inactive customers
 */
async function sendWinbackCampaign(data: { retailerId: string; daysInactive?: number }) {
  const { retailerId, daysInactive = 30 } = data;

  // Get inactive customers
  const { data: customers } = await supabase.rpc('get_inactive_customers', {
    p_retailer_id: retailerId,
    p_days_inactive: daysInactive,
    p_limit: 50,
  });

  if (!customers || customers.length === 0) {
    return { messagesSent: 0 };
  }

  let sentCount = 0;

  for (const customer of customers) {
    // Personalize message
    let message = `Hi ${customer.customer_name}! 🌟\n\n`;
    message += `We miss you! It's been a while since your last order.\n\n`;
    
    if (customer.preferred_categories && customer.preferred_categories.length > 0) {
      message += `We have new arrivals in ${customer.preferred_categories.join(', ')} that we think you'll love!\n\n`;
    }
    
    message += `✨ Special offer: 15% off your next order!\n`;
    message += `Use code: WELCOME_BACK\n\n`;
    message += `Browse our latest collection now! 👗👠\n`;
    message += `Reply "catalog" to see what's new.`;

    // Send WhatsApp message
    const sent = await sendWhatsAppMessage(customer.phone_number, message);

    if (sent) {
      // Log engagement send
      await supabase.from('engagement_sends').insert({
        retailer_id: retailerId,
        customer_id: customer.customer_id,
        campaign_id: null,
        message_content: message,
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: {
          campaign_type: 'win_back',
          days_inactive: customer.days_inactive,
          previous_orders: customer.total_orders,
          previous_spent: customer.total_spent,
        },
      });

      sentCount++;
    }
  }

  return { messagesSent: sentCount };
}

/**
 * Send ghost shopper conversion campaign
 */
async function sendGhostShopperCampaign(data: { retailerId: string }) {
  const { retailerId } = data;

  // Get ghost shoppers
  const { data: ghostShoppers } = await supabase.rpc('get_ghost_shoppers_for_engagement', {
    p_retailer_id: retailerId,
    p_min_inquiries: 5,
    p_limit: 30,
  });

  if (!ghostShoppers || ghostShoppers.length === 0) {
    return { messagesSent: 0 };
  }

  let sentCount = 0;

  for (const shopper of ghostShoppers) {
    // Build message based on their interests
    let message = `Hi ${shopper.customer_name}! 💝\n\n`;
    message += `We noticed you've been browsing our collection!\n\n`;
    message += `We'd love to help you find exactly what you're looking for.\n\n`;
    message += `🎁 First-time buyer offer: 20% OFF your first order!\n`;
    message += `Use code: FIRST20\n\n`;
    message += `Have questions? I'm here to help! Just ask. 😊\n\n`;
    message += `What are you shopping for today?`;

    // Send WhatsApp message
    const sent = await sendWhatsAppMessage(shopper.phone_number, message);

    if (sent) {
      // Log engagement send
      await supabase.from('engagement_sends').insert({
        retailer_id: retailerId,
        customer_id: shopper.customer_id,
        campaign_id: null,
        message_content: message,
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: {
          campaign_type: 'ghost_shopper',
          inquiry_count: shopper.inquiry_count,
          view_count: shopper.view_count,
        },
      });

      sentCount++;
    }
  }

  return { messagesSent: sentCount };
}

/**
 * Send new product alert to interested customers
 */
async function sendNewProductAlert(data: { retailerId: string; productId: string }) {
  const { retailerId, productId } = data;

  // Get product details
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (!product) {
    throw new Error('Product not found');
  }

  // Get customers who viewed similar products or categories
  const { data: customers } = await supabase
    .from('customer_interactions')
    .select('customer_id, customers(name, phone_number)')
    .eq('interaction_type', 'category_browsed')
    .eq('metadata->>category', product.category)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .limit(100);

  if (!customers || customers.length === 0) {
    return { messagesSent: 0 };
  }

  // Get unique customers
  const uniqueCustomers = Array.from(
    new Map(customers.map((c: any) => [c.customer_id, c.customers])).values()
  );

  let sentCount = 0;

  for (const customer of uniqueCustomers) {
    let message = `Hi ${customer.name}! ✨\n\n`;
    message += `🆕 NEW ARRIVAL: ${product.name}\n\n`;
    
    if (product.description) {
      message += `${product.description.substring(0, 100)}...\n\n`;
    }
    
    message += `💰 Price: ${product.price.toLocaleString()} ${product.currency}\n`;
    
    if (product.stock_quantity <= 10) {
      message += `⚠️ Limited stock: Only ${product.stock_quantity} available!\n\n`;
    } else {
      message += `\n`;
    }
    
    message += `Be the first to order! Reply "details" to learn more.`;

    // Send WhatsApp message
    const sent = await sendWhatsAppMessage(customer.phone_number, message);

    if (sent) {
      // Log engagement send
      await supabase.from('engagement_sends').insert({
        retailer_id: retailerId,
        customer_id: customer.customer_id,
        campaign_id: null,
        message_content: message,
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: {
          campaign_type: 'new_product',
          product_id: productId,
          product_name: product.name,
        },
      });

      sentCount++;
    }
  }

  return { messagesSent: sentCount };
}

/**
 * Send generic campaign using template
 */
async function sendGenericCampaign(campaignId: string) {
  const { data: sendCount } = await supabase.rpc('send_engagement_campaign', {
    p_campaign_id: campaignId,
  });

  return sendCount || 0;
}

/**
 * Get all campaigns
 */
async function getCampaigns(data: { retailerId: string }) {
  const { retailerId } = data;

  const { data: campaigns, error } = await supabase
    .from('engagement_campaigns')
    .select('*')
    .eq('retailer_id', retailerId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return { campaigns: campaigns || [] };
}

/**
 * Get campaign performance metrics
 */
async function getCampaignPerformance(data: { campaignId: string }) {
  const { campaignId } = data;

  const { data: campaign } = await supabase
    .from('engagement_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (!campaign) {
    throw new Error('Campaign not found');
  }

  // Get detailed send stats
  const { data: sends } = await supabase
    .from('engagement_sends')
    .select('*')
    .eq('campaign_id', campaignId);

  const totalSends = sends?.length || 0;
  const delivered = sends?.filter((s: any) => s.status === 'delivered').length || 0;
  const read = sends?.filter((s: any) => s.read_at).length || 0;
  const clicked = sends?.filter((s: any) => s.clicked).length || 0;
  const converted = sends?.filter((s: any) => s.converted).length || 0;

  // Calculate rates
  const deliveryRate = totalSends > 0 ? (delivered / totalSends) * 100 : 0;
  const openRate = delivered > 0 ? (read / delivered) * 100 : 0;
  const clickRate = read > 0 ? (clicked / read) * 100 : 0;
  const conversionRate = totalSends > 0 ? (converted / totalSends) * 100 : 0;

  return {
    campaign,
    metrics: {
      totalSends,
      delivered,
      read,
      clicked,
      converted,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      openRate: Math.round(openRate * 100) / 100,
      clickRate: Math.round(clickRate * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
    },
    recentSends: sends?.slice(0, 10) || [],
  };
}

/**
 * Send WhatsApp message via API
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
