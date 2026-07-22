/**
 * Inventory Analytics & Predictions API
 * 
 * Provides predictive analytics for inventory management:
 * - Dead stock risk analysis
 * - Reorder recommendations
 * - Inventory alerts
 * - Demand forecasting
 * 
 * Solves: "Dead seasonal inventory" problem
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
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  const url = new URL(req.url);
  const path = url.pathname.split('/').pop();

  try {
    let result;

    switch (path) {
      case 'dashboard':
        result = await getInventoryDashboard(req);
        break;
      case 'at-risk':
        result = await getProductsAtRisk(req);
        break;
      case 'alerts':
        result = await getInventoryAlerts(req);
        break;
      case 'predictions':
        result = await getInventoryPredictions(req);
        break;
      case 'generate':
        result = await generatePredictions(req);
        break;
      case 'trends':
        result = await getInventoryTrends(req);
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
    console.error('Inventory analytics error:', error);
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
 * Get complete inventory dashboard data
 */
async function getInventoryDashboard(req: Request) {
  const authHeader = req.headers.get('authorization');
  const retailerId = await getRetailerIdFromAuth(authHeader);

  // Get overall metrics
  const { data: products } = await supabase
    .from('products')
    .select('id, stock_quantity, price')
    .eq('retailer_id', retailerId)
    .eq('is_active', true);

  const totalProducts = products?.length || 0;
  const totalStockValue = products?.reduce((sum, p) => sum + (p.stock_quantity * p.price), 0) || 0;
  const lowStockProducts = products?.filter(p => p.stock_quantity <= 5).length || 0;

  // Get at-risk products
  const { data: atRiskProducts } = await supabase.rpc('get_products_at_risk', {
    p_retailer_id: retailerId,
    p_limit: 10,
  });

  // Get recent alerts
  const { data: alerts } = await supabase
    .from('inventory_alerts')
    .select('*')
    .eq('retailer_id', retailerId)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(5);

  // Calculate dead stock value
  const deadStockValue = atRiskProducts?.reduce((sum: number, p: any) => {
    if (p.risk_score >= 60) {
      return sum + parseFloat(p.stock_value || 0);
    }
    return sum;
  }, 0) || 0;

  return {
    metrics: {
      totalProducts,
      totalStockValue: Math.round(totalStockValue),
      lowStockProducts,
      deadStockValue: Math.round(deadStockValue),
      atRiskProducts: atRiskProducts?.length || 0,
      unreadAlerts: alerts?.length || 0,
    },
    atRiskProducts: atRiskProducts || [],
    recentAlerts: alerts || [],
  };
}

/**
 * Get products at risk of becoming dead stock
 */
async function getProductsAtRisk(req: Request) {
  const authHeader = req.headers.get('authorization');
  const retailerId = await getRetailerIdFromAuth(authHeader);

  const url = new URL(req.url);
  const minRisk = parseInt(url.searchParams.get('min_risk') || '40');
  const limit = parseInt(url.searchParams.get('limit') || '20');

  const { data: products, error } = await supabase.rpc('get_products_at_risk', {
    p_retailer_id: retailerId,
    p_limit: limit,
  });

  if (error) throw error;

  // Enrich with additional data
  const enrichedProducts = await Promise.all(
    (products || []).map(async (product: any) => {
      // Get inquiry count
      const { count: inquiryCount } = await supabase
        .from('customer_interactions')
        .select('*', { count: 'exact', head: true })
        .eq('interaction_type', 'product_viewed')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .like('metadata', `%${product.product_id}%`);

      return {
        ...product,
        inquiry_count: inquiryCount || 0,
      };
    })
  );

  return {
    products: enrichedProducts.filter(p => p.risk_score >= minRisk),
    count: enrichedProducts.filter(p => p.risk_score >= minRisk).length,
  };
}

/**
 * Get inventory alerts
 */
async function getInventoryAlerts(req: Request) {
  const authHeader = req.headers.get('authorization');
  const retailerId = await getRetailerIdFromAuth(authHeader);

  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get('unread_only') === 'true';
  const alertType = url.searchParams.get('type');
  const limit = parseInt(url.searchParams.get('limit') || '50');

  let query = supabase
    .from('inventory_alerts')
    .select('*, products(name, category, price)')
    .eq('retailer_id', retailerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.eq('is_read', false);
  }

  if (alertType) {
    query = query.eq('alert_type', alertType);
  }

  const { data: alerts, error } = await query;

  if (error) throw error;

  // Group by severity
  const grouped = {
    critical: alerts?.filter(a => a.severity === 'critical') || [],
    high: alerts?.filter(a => a.severity === 'high') || [],
    medium: alerts?.filter(a => a.severity === 'medium') || [],
    low: alerts?.filter(a => a.severity === 'low') || [],
  };

  return {
    alerts: alerts || [],
    grouped,
    unreadCount: alerts?.filter(a => !a.is_read).length || 0,
  };
}

/**
 * Get inventory predictions
 */
async function getInventoryPredictions(req: Request) {
  const authHeader = req.headers.get('authorization');
  const retailerId = await getRetailerIdFromAuth(authHeader);

  const url = new URL(req.url);
  const productId = url.searchParams.get('product_id');

  let query = supabase
    .from('inventory_predictions')
    .select('*, products(name, category, price, stock_quantity)')
    .eq('retailer_id', retailerId);

  if (productId) {
    query = query.eq('product_id', productId);
    const { data: prediction, error } = await query.single();
    if (error) throw error;
    return { prediction };
  }

  const { data: predictions, error } = await query.order('dead_stock_risk', { ascending: false });

  if (error) throw error;

  return {
    predictions: predictions || [],
    count: predictions?.length || 0,
  };
}

/**
 * Generate new predictions (run daily)
 */
async function generatePredictions(req: Request) {
  const authHeader = req.headers.get('authorization');
  const retailerId = await getRetailerIdFromAuth(authHeader);

  // Create inventory snapshot
  const { data: snapshotCount, error: snapshotError } = await supabase.rpc(
    'create_inventory_snapshot',
    { p_retailer_id: retailerId }
  );

  if (snapshotError) {
    console.error('Snapshot creation error:', snapshotError);
  }

  // Generate predictions
  const { data: predictionCount, error: predictionError } = await supabase.rpc(
    'generate_inventory_predictions',
    { p_retailer_id: retailerId }
  );

  if (predictionError) {
    console.error('Prediction generation error:', predictionError);
  }

  // Generate alerts
  const { data: alertCount, error: alertError } = await supabase.rpc(
    'generate_inventory_alerts',
    { p_retailer_id: retailerId }
  );

  if (alertError) {
    console.error('Alert generation error:', alertError);
  }

  return {
    snapshotsCreated: snapshotCount || 0,
    predictionsGenerated: predictionCount || 0,
    alertsCreated: alertCount || 0,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Get inventory trends over time
 */
async function getInventoryTrends(req: Request) {
  const authHeader = req.headers.get('authorization');
  const retailerId = await getRetailerIdFromAuth(authHeader);

  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get('days') || '30');
  const productId = url.searchParams.get('product_id');

  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  let query = supabase
    .from('inventory_snapshots')
    .select('*')
    .eq('retailer_id', retailerId)
    .gte('snapshot_date', startDate.toISOString().split('T')[0])
    .order('snapshot_date', { ascending: true });

  if (productId) {
    query = query.eq('product_id', productId);
  }

  const { data: snapshots, error } = await query;

  if (error) throw error;

  // Aggregate by date
  const trendsByDate: Record<string, any> = {};

  snapshots?.forEach((snapshot) => {
    const date = snapshot.snapshot_date;
    if (!trendsByDate[date]) {
      trendsByDate[date] = {
        date,
        totalStock: 0,
        totalValue: 0,
        unitsSold: 0,
        revenue: 0,
      };
    }

    trendsByDate[date].totalStock += snapshot.stock_quantity;
    trendsByDate[date].totalValue += parseFloat(snapshot.stock_value);
    trendsByDate[date].unitsSold += snapshot.units_sold;
    trendsByDate[date].revenue += parseFloat(snapshot.revenue_generated);
  });

  const trends = Object.values(trendsByDate);

  return {
    trends,
    startDate: startDate.toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    dataPoints: trends.length,
  };
}

/**
 * Get retailer ID from authorization header
 */
async function getRetailerIdFromAuth(authHeader: string | null): Promise<string> {
  if (!authHeader) {
    throw new Error('Authorization required');
  }

  // Extract JWT and get user email
  // In production, properly verify JWT
  const token = authHeader.replace('Bearer ', '');

  // For now, get retailer from query or use service role
  // In production, decode JWT and get user email
  const { data: retailers } = await supabase
    .from('retailers')
    .select('id')
    .limit(1);

  if (!retailers || retailers.length === 0) {
    throw new Error('Retailer not found');
  }

  return retailers[0].id;
}
