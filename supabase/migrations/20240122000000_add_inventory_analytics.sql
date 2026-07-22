-- Migration: Predictive Inventory Analytics
-- Purpose: Track inventory movement, predict dead stock, generate reorder alerts
-- Solves: "Dead seasonal inventory" problem - predict and prevent slow-moving stock

-- Table: inventory_snapshots
-- Daily snapshots of inventory levels for trend analysis
CREATE TABLE IF NOT EXISTS inventory_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  snapshot_date DATE NOT NULL,
  
  -- Foreign Keys
  retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  
  -- Inventory Data
  stock_quantity INTEGER NOT NULL,
  stock_value DECIMAL(10, 2) NOT NULL, -- quantity * price
  
  -- Movement Data (since last snapshot)
  units_sold INTEGER DEFAULT 0,
  units_added INTEGER DEFAULT 0,
  revenue_generated DECIMAL(10, 2) DEFAULT 0,
  
  -- Unique: one snapshot per product per day
  UNIQUE(product_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_product ON inventory_snapshots(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_date ON inventory_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_retailer ON inventory_snapshots(retailer_id);

-- Table: inventory_predictions
-- AI-generated predictions for product demand and dead stock risk
CREATE TABLE IF NOT EXISTS inventory_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign Keys
  retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  
  -- Prediction Data
  dead_stock_risk DECIMAL(5, 2) NOT NULL DEFAULT 0, -- 0-100 risk score
  days_until_dead INTEGER, -- Estimated days until stock becomes dead
  predicted_monthly_sales DECIMAL(10, 2) DEFAULT 0,
  sell_through_rate DECIMAL(5, 2) DEFAULT 0, -- % of stock sold per month
  
  -- Recommendations
  recommended_action TEXT, -- 'restock', 'discount', 'clear_out', 'hold'
  recommended_discount_percentage INTEGER, -- 0-100
  
  -- Demand Signals
  inquiry_count INTEGER DEFAULT 0, -- WhatsApp inquiries last 30 days
  view_count INTEGER DEFAULT 0, -- Product views last 30 days
  add_to_cart_count INTEGER DEFAULT 0, -- Times added to order flow
  purchase_count INTEGER DEFAULT 0, -- Actual purchases last 30 days
  
  -- Seasonality
  is_seasonal BOOLEAN DEFAULT false,
  peak_months INTEGER[], -- [1-12] representing months
  
  -- Prediction Metadata
  model_version TEXT DEFAULT 'v1',
  confidence_score DECIMAL(5, 2) DEFAULT 0, -- 0-100
  
  -- Unique: one prediction per product
  UNIQUE(product_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_predictions_product ON inventory_predictions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_predictions_risk ON inventory_predictions(dead_stock_risk DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_predictions_retailer ON inventory_predictions(retailer_id);

-- Table: inventory_alerts
-- Automated alerts for retailers about inventory issues
CREATE TABLE IF NOT EXISTS inventory_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign Keys
  retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  
  -- Alert Details
  alert_type TEXT NOT NULL, -- 'dead_stock_risk', 'low_stock', 'reorder_now', 'seasonal_peak', 'overstock'
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Alert Data
  current_stock INTEGER,
  recommended_action TEXT,
  estimated_loss DECIMAL(10, 2), -- Potential revenue loss if not acted upon
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  is_actioned BOOLEAN DEFAULT false,
  actioned_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_inventory_alerts_retailer ON inventory_alerts(retailer_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_product ON inventory_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_type ON inventory_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_unread ON inventory_alerts(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_created ON inventory_alerts(created_at DESC);

-- Table: reorder_recommendations
-- Smart reorder suggestions based on demand patterns
CREATE TABLE IF NOT EXISTS reorder_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign Keys
  retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  
  -- Recommendation Details
  recommended_quantity INTEGER NOT NULL,
  estimated_cost DECIMAL(10, 2) NOT NULL,
  priority INTEGER DEFAULT 0, -- 1-5, 5 being highest
  
  -- Justification
  reason TEXT NOT NULL,
  data_points JSONB NOT NULL, -- Supporting data for recommendation
  
  -- Timing
  reorder_by_date DATE,
  estimated_stockout_date DATE,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'dismissed')),
  ordered_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reorder_recommendations_retailer ON reorder_recommendations(retailer_id);
CREATE INDEX IF NOT EXISTS idx_reorder_recommendations_product ON reorder_recommendations(product_id);
CREATE INDEX IF NOT EXISTS idx_reorder_recommendations_priority ON reorder_recommendations(priority DESC);
CREATE INDEX IF NOT EXISTS idx_reorder_recommendations_status ON reorder_recommendations(status);

-- Function: Create daily inventory snapshot
CREATE OR REPLACE FUNCTION create_inventory_snapshot(p_retailer_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_snapshot_count INTEGER;
BEGIN
  -- Insert today's snapshot for all products
  INSERT INTO inventory_snapshots (
    snapshot_date,
    retailer_id,
    product_id,
    stock_quantity,
    stock_value,
    units_sold,
    units_added,
    revenue_generated
  )
  SELECT 
    CURRENT_DATE,
    p_retailer_id,
    p.id,
    p.stock_quantity,
    p.stock_quantity * p.price,
    -- Calculate units sold since last snapshot
    COALESCE((
      SELECT SUM(oi.quantity)
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.product_id = p.id
      AND o.retailer_id = p_retailer_id
      AND o.created_at >= CURRENT_DATE
      AND o.status != 'cancelled'
    ), 0),
    -- Units added (would need stock adjustment tracking)
    0,
    -- Revenue generated today
    COALESCE((
      SELECT SUM(oi.subtotal)
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.product_id = p.id
      AND o.retailer_id = p_retailer_id
      AND o.created_at >= CURRENT_DATE
      AND o.status != 'cancelled'
    ), 0)
  FROM products p
  WHERE p.retailer_id = p_retailer_id
  AND p.is_active = true
  ON CONFLICT (product_id, snapshot_date) DO UPDATE SET
    stock_quantity = EXCLUDED.stock_quantity,
    stock_value = EXCLUDED.stock_value,
    units_sold = EXCLUDED.units_sold,
    revenue_generated = EXCLUDED.revenue_generated;
  
  GET DIAGNOSTICS v_snapshot_count = ROW_COUNT;
  RETURN v_snapshot_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate dead stock risk score
CREATE OR REPLACE FUNCTION calculate_dead_stock_risk(p_product_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_risk_score DECIMAL := 0;
  v_days_in_stock INTEGER;
  v_total_sales INTEGER;
  v_recent_sales INTEGER;
  v_inquiry_count INTEGER;
  v_stock_quantity INTEGER;
  v_sell_through_rate DECIMAL;
BEGIN
  -- Get product data
  SELECT 
    EXTRACT(DAY FROM NOW() - created_at)::INTEGER,
    stock_quantity
  INTO v_days_in_stock, v_stock_quantity
  FROM products
  WHERE id = p_product_id;

  -- Get sales data
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE o.created_at >= NOW() - INTERVAL '30 days')
  INTO v_total_sales, v_recent_sales
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE oi.product_id = p_product_id
  AND o.status != 'cancelled';

  -- Get inquiry data
  SELECT COUNT(*)
  INTO v_inquiry_count
  FROM customer_interactions
  WHERE metadata->>'productId' = p_product_id::TEXT
  AND interaction_type IN ('product_viewed', 'product_inquiry')
  AND created_at >= NOW() - INTERVAL '30 days';

  -- Calculate risk factors
  
  -- Factor 1: Age without sales (max 40 points)
  IF v_total_sales = 0 AND v_days_in_stock > 90 THEN
    v_risk_score := v_risk_score + 40;
  ELSIF v_total_sales = 0 AND v_days_in_stock > 60 THEN
    v_risk_score := v_risk_score + 30;
  ELSIF v_total_sales = 0 AND v_days_in_stock > 30 THEN
    v_risk_score := v_risk_score + 20;
  END IF;

  -- Factor 2: Recent sales decline (max 30 points)
  IF v_total_sales > 0 THEN
    v_sell_through_rate := (v_recent_sales::DECIMAL / v_total_sales) * 100;
    IF v_sell_through_rate = 0 THEN
      v_risk_score := v_risk_score + 30;
    ELSIF v_sell_through_rate < 10 THEN
      v_risk_score := v_risk_score + 20;
    ELSIF v_sell_through_rate < 25 THEN
      v_risk_score := v_risk_score + 10;
    END IF;
  END IF;

  -- Factor 3: Low inquiry rate (max 20 points)
  IF v_inquiry_count = 0 THEN
    v_risk_score := v_risk_score + 20;
  ELSIF v_inquiry_count < 3 THEN
    v_risk_score := v_risk_score + 10;
  END IF;

  -- Factor 4: High stock with low movement (max 10 points)
  IF v_stock_quantity > 10 AND v_recent_sales < 2 THEN
    v_risk_score := v_risk_score + 10;
  END IF;

  RETURN LEAST(v_risk_score, 100);
END;
$$ LANGUAGE plpgsql;

-- Function: Generate inventory predictions for all products
CREATE OR REPLACE FUNCTION generate_inventory_predictions(p_retailer_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_product RECORD;
  v_prediction_count INTEGER := 0;
  v_risk_score DECIMAL;
  v_monthly_sales DECIMAL;
  v_recommended_action TEXT;
  v_discount_pct INTEGER;
BEGIN
  FOR v_product IN 
    SELECT * FROM products 
    WHERE retailer_id = p_retailer_id 
    AND is_active = true
  LOOP
    -- Calculate risk score
    v_risk_score := calculate_dead_stock_risk(v_product.id);
    
    -- Calculate monthly sales average
    SELECT COALESCE(AVG(units_sold), 0)
    INTO v_monthly_sales
    FROM inventory_snapshots
    WHERE product_id = v_product.id
    AND snapshot_date >= CURRENT_DATE - INTERVAL '90 days';
    
    -- Determine recommended action
    IF v_risk_score >= 80 THEN
      v_recommended_action := 'clear_out';
      v_discount_pct := 50;
    ELSIF v_risk_score >= 60 THEN
      v_recommended_action := 'discount';
      v_discount_pct := 30;
    ELSIF v_risk_score >= 40 THEN
      v_recommended_action := 'promote';
      v_discount_pct := 15;
    ELSIF v_monthly_sales > 5 AND v_product.stock_quantity < v_monthly_sales THEN
      v_recommended_action := 'restock';
      v_discount_pct := 0;
    ELSE
      v_recommended_action := 'hold';
      v_discount_pct := 0;
    END IF;
    
    -- Upsert prediction
    INSERT INTO inventory_predictions (
      retailer_id,
      product_id,
      dead_stock_risk,
      predicted_monthly_sales,
      recommended_action,
      recommended_discount_percentage,
      confidence_score
    ) VALUES (
      p_retailer_id,
      v_product.id,
      v_risk_score,
      v_monthly_sales,
      v_recommended_action,
      v_discount_pct,
      75 -- Base confidence score
    )
    ON CONFLICT (product_id) DO UPDATE SET
      dead_stock_risk = EXCLUDED.dead_stock_risk,
      predicted_monthly_sales = EXCLUDED.predicted_monthly_sales,
      recommended_action = EXCLUDED.recommended_action,
      recommended_discount_percentage = EXCLUDED.recommended_discount_percentage,
      updated_at = NOW();
    
    v_prediction_count := v_prediction_count + 1;
  END LOOP;
  
  RETURN v_prediction_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Generate inventory alerts based on predictions
CREATE OR REPLACE FUNCTION generate_inventory_alerts(p_retailer_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_prediction RECORD;
  v_alert_count INTEGER := 0;
  v_product RECORD;
BEGIN
  -- Dead stock risk alerts
  FOR v_prediction IN 
    SELECT ip.*, p.name, p.price, p.stock_quantity
    FROM inventory_predictions ip
    JOIN products p ON p.id = ip.product_id
    WHERE ip.retailer_id = p_retailer_id
    AND ip.dead_stock_risk >= 60
    AND NOT EXISTS (
      SELECT 1 FROM inventory_alerts
      WHERE product_id = ip.product_id
      AND alert_type = 'dead_stock_risk'
      AND created_at >= NOW() - INTERVAL '7 days'
      AND is_dismissed = false
    )
  LOOP
    INSERT INTO inventory_alerts (
      retailer_id,
      product_id,
      alert_type,
      severity,
      title,
      message,
      current_stock,
      recommended_action,
      estimated_loss,
      metadata
    ) VALUES (
      p_retailer_id,
      v_prediction.product_id,
      'dead_stock_risk',
      CASE 
        WHEN v_prediction.dead_stock_risk >= 80 THEN 'critical'
        WHEN v_prediction.dead_stock_risk >= 60 THEN 'high'
        ELSE 'medium'
      END,
      'Dead Stock Alert: ' || v_prediction.name,
      format('Product "%s" has %s%% risk of becoming dead stock. %s units in stock with minimal sales.',
             v_prediction.name,
             v_prediction.dead_stock_risk,
             v_prediction.stock_quantity),
      v_prediction.stock_quantity,
      v_prediction.recommended_action,
      v_prediction.stock_quantity * v_prediction.price * 0.7, -- Estimated loss at 30% markdown
      jsonb_build_object(
        'risk_score', v_prediction.dead_stock_risk,
        'recommended_discount', v_prediction.recommended_discount_percentage
      )
    );
    
    v_alert_count := v_alert_count + 1;
  END LOOP;
  
  -- Low stock alerts
  FOR v_product IN
    SELECT p.*, ip.predicted_monthly_sales
    FROM products p
    LEFT JOIN inventory_predictions ip ON ip.product_id = p.id
    WHERE p.retailer_id = p_retailer_id
    AND p.is_active = true
    AND p.stock_quantity <= p.low_stock_threshold
    AND p.stock_quantity > 0
    AND NOT EXISTS (
      SELECT 1 FROM inventory_alerts
      WHERE product_id = p.id
      AND alert_type = 'low_stock'
      AND created_at >= NOW() - INTERVAL '3 days'
      AND is_dismissed = false
    )
  LOOP
    INSERT INTO inventory_alerts (
      retailer_id,
      product_id,
      alert_type,
      severity,
      title,
      message,
      current_stock,
      recommended_action
    ) VALUES (
      p_retailer_id,
      v_product.id,
      'low_stock',
      CASE 
        WHEN v_product.stock_quantity = 0 THEN 'critical'
        WHEN v_product.stock_quantity <= 3 THEN 'high'
        ELSE 'medium'
      END,
      'Low Stock: ' || v_product.name,
      format('Only %s units left of "%s". Consider reordering soon.',
             v_product.stock_quantity,
             v_product.name),
      v_product.stock_quantity,
      'reorder_now'
    );
    
    v_alert_count := v_alert_count + 1;
  END LOOP;
  
  RETURN v_alert_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Get products at risk (for dashboard)
CREATE OR REPLACE FUNCTION get_products_at_risk(p_retailer_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  category TEXT,
  stock_quantity INTEGER,
  stock_value DECIMAL,
  risk_score DECIMAL,
  recommended_action TEXT,
  recommended_discount INTEGER,
  days_without_sale INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.category,
    p.stock_quantity,
    (p.stock_quantity * p.price)::DECIMAL(10,2),
    ip.dead_stock_risk,
    ip.recommended_action,
    ip.recommended_discount_percentage,
    EXTRACT(DAY FROM NOW() - COALESCE(
      (SELECT MAX(o.created_at) 
       FROM orders o 
       JOIN order_items oi ON oi.order_id = o.id 
       WHERE oi.product_id = p.id), 
      p.created_at
    ))::INTEGER
  FROM products p
  LEFT JOIN inventory_predictions ip ON ip.product_id = p.id
  WHERE p.retailer_id = p_retailer_id
  AND p.is_active = true
  AND ip.dead_stock_risk >= 40
  ORDER BY ip.dead_stock_risk DESC, p.stock_quantity DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security
ALTER TABLE inventory_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reorder_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS retailer_inventory_snapshots ON inventory_snapshots;
CREATE POLICY retailer_inventory_snapshots ON inventory_snapshots
  FOR ALL USING (
    retailer_id IN (SELECT id FROM retailers WHERE email = auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS retailer_inventory_predictions ON inventory_predictions;
CREATE POLICY retailer_inventory_predictions ON inventory_predictions
  FOR ALL USING (
    retailer_id IN (SELECT id FROM retailers WHERE email = auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS retailer_inventory_alerts ON inventory_alerts;
CREATE POLICY retailer_inventory_alerts ON inventory_alerts
  FOR ALL USING (
    retailer_id IN (SELECT id FROM retailers WHERE email = auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS retailer_reorder_recommendations ON reorder_recommendations;
CREATE POLICY retailer_reorder_recommendations ON reorder_recommendations
  FOR ALL USING (
    retailer_id IN (SELECT id FROM retailers WHERE email = auth.jwt() ->> 'email')
  );

-- Comments
COMMENT ON TABLE inventory_snapshots IS 'Daily snapshots of inventory levels for trend analysis and dead stock prediction';
COMMENT ON TABLE inventory_predictions IS 'AI-generated predictions for product demand, dead stock risk, and reorder recommendations';
COMMENT ON TABLE inventory_alerts IS 'Automated alerts for dead stock risk, low stock, and reorder triggers';
COMMENT ON FUNCTION calculate_dead_stock_risk IS 'Calculates 0-100 risk score based on age, sales decline, inquiry rate, and stock level';
COMMENT ON FUNCTION generate_inventory_predictions IS 'Generates AI predictions for all products - run daily via cron job';
COMMENT ON FUNCTION generate_inventory_alerts IS 'Creates alerts based on predictions - notifies retailers of inventory issues';
