/**
 * WhatsApp Analytics Dashboard API
 * 
 * Provides comprehensive metrics and insights:
 * - Customer engagement (views, inquiries, orders)
 * - Conversion funnel analysis
 * - Ghost shopper identification
 * - Product demand signals
 * - Campaign performance
 * - Revenue attribution
 * 
 * Solves: Visibility into WhatsApp ROI and customer behavior
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const endpoint = url.pathname.split('/').pop();

    let result;

    switch (endpoint) {
      case 'overview':
        result = await getOverviewMetrics(url);
        break;
      case 'conversion-funnel':
        result = await getConversionFunnel(url);
        break;
      case 'ghost-shoppers':
        result = await getGhostShoppers(url);
        break;
      case 'product-demand':
        result = await getProductDemand(url);
        break;
      case 'campaign-performance':
        result = await getCampaignPerformance(url);
        break;
      case 'revenue-attribution':
        result = await getRevenueAttribution(url);
        break;
      case 'customer-insights':
        result = await getCustomerInsights(url);
        break;
      case 'trending-products':
        result = await getTrendingProducts(url);
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
    console.error('WhatsApp analytics error:', error);
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
 * Get overview metrics dashboard
 */
async function getOverviewMetrics(url: URL) {
  const days = parseInt(url.searchParams.get('days') || '30');
  const retailerId = await getRetailerId();

  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Total WhatsApp customers
  const { count: totalCustomers } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('retailer_id', retailerId)
    .eq('whatsapp_active', true);

  // New customers (last X days)
  const { count: newCustomers } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('retailer_id', retailerId)
    .eq('first_contact_channel', 'whatsapp')
    .gte('created_at', startDate);

  // Total messages
  const { count: totalMessages } = await supabase
    .from('whatsapp_messages')
    .select('*', { count: 'exact', head: true })
    .eq('retailer_id', retailerId)
    .gte('created_at', startDate);

  // Total orders from WhatsApp
  const { data: whatsappOrders } = await supabase
    .from('orders')
    .select('total_amount')
    .eq('retailer_id', retailerId)
    .eq('metadata->>source', 'whatsapp')
    .gte('created_at', startDate);

  const totalOrders = whatsappOrders?.length || 0;
  const totalRevenue = whatsappOrders?.reduce((sum, o) => sum + parseFloat(o.total_amount), 0) || 0;

  // Product inquiries
  const { count: totalInquiries } = await supabase
    .from('customer_interactions')
    .select('*', { count: 'exact', head: true })
    .in('interaction_type', ['product_viewed', 'product_inquiry'])
    .gte('created_at', startDate);

  // Ghost shoppers
  const { data: ghostShoppers } = await supabase.rpc('get_ghost_shoppers', {
    p_retailer_id: retailerId,
    p_limit: 100,
  });

  // Calculate conversion rate
  const conversionRate = totalInquiries ? (totalOrders / totalInquiries) * 100 : 0;

  // Get daily trend
  const { data: dailyStats } = await supabase
    .from('customer_interactions')
    .select('created_at, interaction_type')
    .gte('created_at', startDate)
    .order('created_at', { ascending: true });

  // Group by date
  const dailyTrend = groupByDate(dailyStats || [], days);

  return {
    period: `Last ${days} days`,
    metrics: {
      totalCustomers: totalCustomers || 0,
      newCustomers: newCustomers || 0,
      totalMessages: totalMessages || 0,
      totalInquiries: totalInquiries || 0,
      totalOrders,
      totalRevenue: Math.round(totalRevenue),
      conversionRate: Math.round(conversionRate * 100) / 100,
      ghostShoppers: ghostShoppers?.length || 0,
      avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
    },
    dailyTrend,
  };
}

/**
 * Get conversion funnel metrics
 */
async function getConversionFunnel(url: URL) {
  const days = parseInt(url.searchParams.get('days') || '30');
  const retailerId = await getRetailerId();

  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Funnel stages
  const { count: browsed } = await supabase
    .from('customer_interactions')
    .select('*', { count: 'exact', head: true })
    .eq('interaction_type', 'browse_catalog_initiated')
    .gte('created_at', startDate);

  const { count: viewed } = await supabase
    .from('customer_interactions')
    .select('*', { count: 'exact', head: true })
    .eq('interaction_type', 'product_viewed')
    .gte('created_at', startDate);

  const { count: inquired } = await supabase
    .from('customer_interactions')
    .select('*', { count: 'exact', head: true })
    .in('interaction_type', ['product_inquiry', 'ai_product_inquiry'])
    .gte('created_at', startDate);

  const { count: initiated } = await supabase
    .from('customer_interactions')
    .select('*', { count: 'exact', head: true })
    .eq('interaction_type', 'order_initiated')
    .gte('created_at', startDate);

  const { count: completed } = await supabase
    .from('customer_interactions')
    .select('*', { count: 'exact', head: true })
    .eq('interaction_type', 'order_created')
    .gte('created_at', startDate);

  // Calculate drop-off rates
  const funnel = [
    { stage: 'Browsed Catalog', count: browsed || 0, percentage: 100 },
    {
      stage: 'Viewed Products',
      count: viewed || 0,
      percentage: browsed ? ((viewed || 0) / browsed) * 100 : 0,
      dropOff: browsed ? (((browsed - (viewed || 0)) / browsed) * 100) : 0,
    },
    {
      stage: 'Made Inquiries',
      count: inquired || 0,
      percentage: viewed ? ((inquired || 0) / viewed) * 100 : 0,
      dropOff: viewed ? (((viewed - (inquired || 0)) / viewed) * 100) : 0,
    },
    {
      stage: 'Initiated Order',
      count: initiated || 0,
      percentage: inquired ? ((initiated || 0) / inquired) * 100 : 0,
      dropOff: inquired ? (((inquired - (initiated || 0)) / inquired) * 100) : 0,
    },
    {
      stage: 'Completed Order',
      count: completed || 0,
      percentage: initiated ? ((completed || 0) / initiated) * 100 : 0,
      dropOff: initiated ? (((initiated - (completed || 0)) / initiated) * 100) : 0,
    },
  ];

  return {
    funnel: funnel.map((f) => ({
      ...f,
      percentage: Math.round(f.percentage * 100) / 100,
      dropOff: f.dropOff ? Math.round(f.dropOff * 100) / 100 : undefined,
    })),
    overallConversion: browsed ? ((completed || 0) / browsed) * 100 : 0,
  };
}

/**
 * Get ghost shoppers analytics
 */
async function getGhostShoppers(url: URL) {
  const retailerId = await getRetailerId();

  const { data: ghostShoppers } = await supabase.rpc('get_ghost_shoppers', {
    p_retailer_id: retailerId,
    p_limit: 50,
  });

  if (!ghostShoppers || ghostShoppers.length === 0) {
    return { ghostShoppers: [], count: 0, totalPotentialRevenue: 0 };
  }

  // Estimate potential revenue (avg order value * ghost shoppers)
  const { data: avgOrder } = await supabase
    .from('orders')
    .select('total_amount')
    .eq('retailer_id', retailerId)
    .limit(100);

  const avgOrderValue = avgOrder?.length
    ? avgOrder.reduce((sum, o) => sum + parseFloat(o.total_amount), 0) / avgOrder.length
    : 0;

  const totalPotentialRevenue = avgOrderValue * ghostShoppers.length;

  // Group by inquiry count
  const segments = {
    highEngagement: ghostShoppers.filter((g: any) => g.total_inquiries >= 10),
    mediumEngagement: ghostShoppers.filter(
      (g: any) => g.total_inquiries >= 5 && g.total_inquiries < 10
    ),
    lowEngagement: ghostShoppers.filter((g: any) => g.total_inquiries < 5),
  };

  return {
    ghostShoppers,
    count: ghostShoppers.length,
    totalPotentialRevenue: Math.round(totalPotentialRevenue),
    avgInquiriesPerGhost: Math.round(
      ghostShoppers.reduce((sum: number, g: any) => sum + g.total_inquiries, 0) /
        ghostShoppers.length
    ),
    segments: {
      highEngagement: segments.highEngagement.length,
      mediumEngagement: segments.mediumEngagement.length,
      lowEngagement: segments.lowEngagement.length,
    },
  };
}

/**
 * Get product demand signals
 */
async function getProductDemand(url: URL) {
  const days = parseInt(url.searchParams.get('days') || '30');
  const retailerId = await getRetailerId();

  const { data: products } = await supabase.rpc('get_most_inquired_products', {
    p_retailer_id: retailerId,
    p_days: days,
    p_limit: 20,
  });

  return {
    products: products || [],
    count: products?.length || 0,
  };
}

/**
 * Get campaign performance
 */
async function getCampaignPerformance(url: URL) {
  const retailerId = await getRetailerId();

  const { data: campaigns } = await supabase
    .from('engagement_campaigns')
    .select('*')
    .eq('retailer_id', retailerId)
    .order('total_sent', { ascending: false });

  if (!campaigns || campaigns.length === 0) {
    return { campaigns: [], totalSent: 0, totalConverted: 0 };
  }

  const totalSent = campaigns.reduce((sum, c) => sum + c.total_sent, 0);
  const totalConverted = campaigns.reduce((sum, c) => sum + c.total_converted, 0);

  const campaignsWithMetrics = campaigns.map((campaign) => ({
    ...campaign,
    openRate: campaign.total_sent
      ? ((campaign.total_opened / campaign.total_sent) * 100).toFixed(2)
      : 0,
    clickRate: campaign.total_opened
      ? ((campaign.total_clicked / campaign.total_opened) * 100).toFixed(2)
      : 0,
    conversionRate: campaign.total_sent
      ? ((campaign.total_converted / campaign.total_sent) * 100).toFixed(2)
      : 0,
  }));

  return {
    campaigns: campaignsWithMetrics,
    summary: {
      totalCampaigns: campaigns.length,
      totalSent,
      totalConverted,
      avgConversionRate: totalSent ? ((totalConverted / totalSent) * 100).toFixed(2) : 0,
    },
  };
}

/**
 * Get revenue attribution
 */
async function getRevenueAttribution(url: URL) {
  const days = parseInt(url.searchParams.get('days') || '30');
  const retailerId = await getRetailerId();

  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // WhatsApp orders
  const { data: whatsappOrders } = await supabase
    .from('orders')
    .select('total_amount, created_at')
    .eq('retailer_id', retailerId)
    .eq('metadata->>source', 'whatsapp')
    .gte('created_at', startDate);

  const whatsappRevenue = whatsappOrders?.reduce((sum, o) => sum + parseFloat(o.total_amount), 0) || 0;

  // All orders
  const { data: allOrders } = await supabase
    .from('orders')
    .select('total_amount')
    .eq('retailer_id', retailerId)
    .gte('created_at', startDate);

  const totalRevenue = allOrders?.reduce((sum, o) => sum + parseFloat(o.total_amount), 0) || 0;

  // Campaign-attributed orders
  const { data: campaignOrders } = await supabase
    .from('engagement_sends')
    .select('conversion_order_id, orders(total_amount)')
    .eq('retailer_id', retailerId)
    .eq('converted', true)
    .not('conversion_order_id', 'is', null);

  const campaignRevenue = campaignOrders?.reduce(
    (sum, co: any) => sum + (co.orders ? parseFloat(co.orders.total_amount) : 0),
    0
  ) || 0;

  // AI-attributed orders
  const { data: aiOrders } = await supabase
    .from('customer_interactions')
    .select('metadata')
    .eq('interaction_type', 'ai_recommendation')
    .gte('created_at', startDate);

  // Count AI recommendations that led to orders
  let aiRevenue = 0;
  if (aiOrders) {
    for (const interaction of aiOrders) {
      const customerId = interaction.metadata?.customerId;
      if (customerId) {
        const { data: order } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('customer_id', customerId)
          .eq('metadata->>source', 'whatsapp')
          .gte('created_at', interaction.created_at)
          .limit(1)
          .single();

        if (order) {
          aiRevenue += parseFloat(order.total_amount);
        }
      }
    }
  }

  return {
    period: `Last ${days} days`,
    attribution: {
      whatsapp: {
        revenue: Math.round(whatsappRevenue),
        percentage: totalRevenue ? ((whatsappRevenue / totalRevenue) * 100).toFixed(2) : 0,
        orders: whatsappOrders?.length || 0,
      },
      campaigns: {
        revenue: Math.round(campaignRevenue),
        percentage: whatsappRevenue ? ((campaignRevenue / whatsappRevenue) * 100).toFixed(2) : 0,
        orders: campaignOrders?.length || 0,
      },
      ai: {
        revenue: Math.round(aiRevenue),
        percentage: whatsappRevenue ? ((aiRevenue / whatsappRevenue) * 100).toFixed(2) : 0,
      },
      total: Math.round(totalRevenue),
    },
  };
}

/**
 * Get customer insights
 */
async function getCustomerInsights(url: URL) {
  const retailerId = await getRetailerId();

  const { data: metrics } = await supabase
    .from('customer_engagement_metrics')
    .select('*')
    .eq('retailer_id', retailerId)
    .order('total_orders', { ascending: false })
    .limit(100);

  if (!metrics || metrics.length === 0) {
    return { insights: {}, topCustomers: [] };
  }

  const avgMessages = metrics.reduce((sum, m) => sum + m.total_messages, 0) / metrics.length;
  const avgOrders = metrics.reduce((sum, m) => sum + m.total_orders, 0) / metrics.length;
  const avgConversion = metrics.reduce((sum, m) => sum + parseFloat(m.conversion_rate), 0) / metrics.length;

  // Segment customers
  const segments = {
    champions: metrics.filter((m) => m.total_orders >= 5 && parseFloat(m.conversion_rate) >= 20),
    loyalCustomers: metrics.filter(
      (m) => m.total_orders >= 3 && m.total_orders < 5 && parseFloat(m.conversion_rate) >= 15
    ),
    potentialLoyalists: metrics.filter(
      (m) => m.total_orders >= 1 && parseFloat(m.conversion_rate) >= 25
    ),
    atRisk: metrics.filter((m) => m.total_orders > 0 && m.last_interaction_at < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    needsAttention: metrics.filter((m) => parseFloat(m.ghost_shopper_score) >= 60),
  };

  return {
    insights: {
      totalCustomers: metrics.length,
      avgMessages: Math.round(avgMessages),
      avgOrders: Math.round(avgOrders * 100) / 100,
      avgConversionRate: Math.round(avgConversion * 100) / 100,
    },
    segments: {
      champions: segments.champions.length,
      loyalCustomers: segments.loyalCustomers.length,
      potentialLoyalists: segments.potentialLoyalists.length,
      atRisk: segments.atRisk.length,
      needsAttention: segments.needsAttention.length,
    },
    topCustomers: metrics.slice(0, 10),
  };
}

/**
 * Get trending products from WhatsApp inquiries
 */
async function getTrendingProducts(url: URL) {
  const days = parseInt(url.searchParams.get('days') || '7');
  const retailerId = await getRetailerId();

  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Get product interactions
  const { data: interactions } = await supabase
    .from('customer_interactions')
    .select('metadata')
    .in('interaction_type', ['product_viewed', 'product_inquiry'])
    .gte('created_at', startDate);

  if (!interactions || interactions.length === 0) {
    return { trendingProducts: [], count: 0 };
  }

  // Count product mentions
  const productCounts: Record<string, { count: number; name: string }> = {};

  interactions.forEach((interaction) => {
    const productId = interaction.metadata?.productId;
    const productName = interaction.metadata?.productName;

    if (productId) {
      if (!productCounts[productId]) {
        productCounts[productId] = { count: 0, name: productName || 'Unknown' };
      }
      productCounts[productId].count++;
    }
  });

  // Sort by count
  const trending = Object.entries(productCounts)
    .map(([productId, data]) => ({
      productId,
      productName: data.name,
      inquiryCount: data.count,
    }))
    .sort((a, b) => b.inquiryCount - a.inquiryCount)
    .slice(0, 10);

  return {
    trendingProducts: trending,
    count: trending.length,
    period: `Last ${days} days`,
  };
}

/**
 * Helper: Group interactions by date
 */
function groupByDate(data: any[], days: number) {
  const dateMap: Record<string, { messages: number; inquiries: number; orders: number }> = {};

  // Initialize all dates
  for (let i = 0; i < days; i++) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    dateMap[date] = { messages: 0, inquiries: 0, orders: 0 };
  }

  // Count interactions
  data.forEach((item) => {
    const date = item.created_at.split('T')[0];
    if (dateMap[date]) {
      if (item.interaction_type.includes('inquiry') || item.interaction_type.includes('viewed')) {
        dateMap[date].inquiries++;
      } else if (item.interaction_type.includes('order')) {
        dateMap[date].orders++;
      }
      dateMap[date].messages++;
    }
  });

  return Object.entries(dateMap)
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Helper: Get retailer ID
 */
async function getRetailerId(): Promise<string> {
  const { data: retailer } = await supabase
    .from('retailers')
    .select('id')
    .limit(1)
    .single();

  if (!retailer) {
    throw new Error('Retailer not found');
  }

  return retailer.id;
}
