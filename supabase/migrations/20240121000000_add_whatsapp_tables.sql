-- Migration: Add WhatsApp integration tables
-- Purpose: Support WhatsApp message storage, customer interactions, and analytics
-- Solves: Ghost shopper tracking, customer engagement metrics, conversation history

-- Table: whatsapp_messages
-- Stores all inbound and outbound WhatsApp messages
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_message_id TEXT UNIQUE, -- WhatsApp's message ID
  retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT NOT NULL, -- 'text', 'image', 'interactive', 'button_reply', 'template'
  content JSONB NOT NULL, -- Full message payload from WhatsApp
  intent TEXT, -- Detected intent: 'product_inquiry', 'order_status', 'greeting', etc.
  products_mentioned UUID[], -- Array of product IDs mentioned
  status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'read', 'failed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_customer ON whatsapp_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON whatsapp_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_retailer ON whatsapp_messages(retailer_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created ON whatsapp_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_intent ON whatsapp_messages(intent);

-- Table: customer_interactions
-- Tracks all customer interactions for analytics and ghost shopper detection
CREATE TABLE IF NOT EXISTS customer_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL, -- 'product_viewed', 'category_browsed', 'order_initiated', etc.
  channel TEXT NOT NULL DEFAULT 'whatsapp', -- 'whatsapp', 'web', 'mobile'
  metadata JSONB, -- Additional context (product_id, category, query, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_interactions_customer ON customer_interactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_interactions_type ON customer_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_customer_interactions_created ON customer_interactions(created_at DESC);

-- Table: customer_engagement_metrics
-- Pre-calculated metrics for dashboard analytics
CREATE TABLE IF NOT EXISTS customer_engagement_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
  retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
  total_messages INT DEFAULT 0,
  total_inquiries INT DEFAULT 0,
  total_orders INT DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0, -- (orders / inquiries) * 100
  last_interaction_at TIMESTAMPTZ,
  first_interaction_at TIMESTAMPTZ,
  average_response_time_seconds INT, -- How fast customer responds
  preferred_categories TEXT[], -- Categories they browse most
  ghost_shopper_score DECIMAL(5,2) DEFAULT 0, -- High inquiries, low conversion = high score
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_customer_engagement_customer ON customer_engagement_metrics(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_engagement_ghost_score ON customer_engagement_metrics(ghost_shopper_score DESC);

-- Add WhatsApp-specific fields to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS whatsapp_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS first_contact_channel TEXT DEFAULT 'whatsapp';

-- Function: Update customer interaction stats
-- Called after each WhatsApp message to update metrics
CREATE OR REPLACE FUNCTION update_customer_interaction_stats(p_customer_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Update last_interaction in customers table
  UPDATE customers
  SET updated_at = NOW()
  WHERE id = p_customer_id;

  -- Upsert engagement metrics
  INSERT INTO customer_engagement_metrics (
    customer_id,
    retailer_id,
    total_messages,
    last_interaction_at,
    first_interaction_at,
    updated_at
  )
  SELECT 
    p_customer_id,
    (SELECT retailer_id FROM customers WHERE id = p_customer_id LIMIT 1),
    1,
    NOW(),
    NOW(),
    NOW()
  ON CONFLICT (customer_id) DO UPDATE SET
    total_messages = customer_engagement_metrics.total_messages + 1,
    last_interaction_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate ghost shopper score
-- High inquiries + low orders = high ghost shopper score
CREATE OR REPLACE FUNCTION calculate_ghost_shopper_score(p_customer_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_inquiries INT;
  v_orders INT;
  v_score DECIMAL;
BEGIN
  -- Count product inquiries
  SELECT COUNT(*) INTO v_inquiries
  FROM customer_interactions
  WHERE customer_id = p_customer_id
  AND interaction_type IN ('product_viewed', 'product_inquiry', 'category_browsed');

  -- Count completed orders
  SELECT COUNT(*) INTO v_orders
  FROM orders
  WHERE customer_id = p_customer_id
  AND status NOT IN ('cancelled');

  -- Calculate score (0-100)
  -- High inquiries with few orders = high score
  IF v_inquiries = 0 THEN
    v_score := 0;
  ELSIF v_orders = 0 THEN
    v_score := LEAST(v_inquiries * 10, 100); -- Max 100
  ELSE
    v_score := GREATEST(0, ((v_inquiries::DECIMAL / v_orders) - 1) * 20);
  END IF;

  RETURN ROUND(v_score, 2);
END;
$$ LANGUAGE plpgsql;

-- Function: Get ghost shoppers (customers with high inquiry, low conversion)
CREATE OR REPLACE FUNCTION get_ghost_shoppers(p_retailer_id UUID, p_limit INT DEFAULT 10)
RETURNS TABLE (
  customer_id UUID,
  customer_name TEXT,
  phone_number TEXT,
  total_inquiries INT,
  total_orders INT,
  ghost_score DECIMAL,
  last_interaction TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.phone_number,
    (SELECT COUNT(*)::INT FROM customer_interactions WHERE customer_id = c.id AND interaction_type LIKE '%inquiry%' OR interaction_type LIKE '%viewed%') as inquiries,
    (SELECT COUNT(*)::INT FROM orders WHERE customer_id = c.id AND status != 'cancelled') as orders,
    calculate_ghost_shopper_score(c.id) as score,
    cem.last_interaction_at
  FROM customers c
  LEFT JOIN customer_engagement_metrics cem ON cem.customer_id = c.id
  WHERE c.retailer_id = p_retailer_id
  AND cem.total_inquiries > 0
  ORDER BY score DESC, cem.last_interaction_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Get WhatsApp conversation history for a customer
CREATE OR REPLACE FUNCTION get_whatsapp_conversation(p_customer_id UUID, p_limit INT DEFAULT 50)
RETURNS TABLE (
  message_id UUID,
  direction TEXT,
  message_type TEXT,
  content JSONB,
  intent TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wm.id,
    wm.direction,
    wm.message_type,
    wm.content,
    wm.intent,
    wm.status,
    wm.created_at
  FROM whatsapp_messages wm
  WHERE wm.customer_id = p_customer_id
  ORDER BY wm.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Get inquiry-to-order conversion rate
CREATE OR REPLACE FUNCTION get_conversion_rate(p_retailer_id UUID, p_days INT DEFAULT 30)
RETURNS TABLE (
  total_inquiries INT,
  total_orders INT,
  conversion_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INT 
     FROM customer_interactions ci
     JOIN customers c ON c.id = ci.customer_id
     WHERE c.retailer_id = p_retailer_id
     AND ci.interaction_type IN ('product_inquiry', 'product_viewed')
     AND ci.created_at >= NOW() - INTERVAL '1 day' * p_days) as inquiries,
    (SELECT COUNT(*)::INT 
     FROM orders o
     WHERE o.retailer_id = p_retailer_id
     AND o.created_at >= NOW() - INTERVAL '1 day' * p_days) as orders,
    CASE 
      WHEN (SELECT COUNT(*) FROM customer_interactions ci JOIN customers c ON c.id = ci.customer_id WHERE c.retailer_id = p_retailer_id AND ci.interaction_type IN ('product_inquiry', 'product_viewed') AND ci.created_at >= NOW() - INTERVAL '1 day' * p_days) = 0 THEN 0
      ELSE ROUND((SELECT COUNT(*)::DECIMAL FROM orders o WHERE o.retailer_id = p_retailer_id AND o.created_at >= NOW() - INTERVAL '1 day' * p_days) / (SELECT COUNT(*) FROM customer_interactions ci JOIN customers c ON c.id = ci.customer_id WHERE c.retailer_id = p_retailer_id AND ci.interaction_type IN ('product_inquiry', 'product_viewed') AND ci.created_at >= NOW() - INTERVAL '1 day' * p_days) * 100, 2)
    END as rate;
END;
$$ LANGUAGE plpgsql;

-- Function: Get most inquired products (demand signals)
CREATE OR REPLACE FUNCTION get_most_inquired_products(p_retailer_id UUID, p_days INT DEFAULT 7, p_limit INT DEFAULT 10)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  inquiry_count INT,
  order_count INT,
  conversion_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    COUNT(DISTINCT ci.id)::INT as inquiries,
    (SELECT COUNT(*)::INT FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.product_id = p.id AND o.created_at >= NOW() - INTERVAL '1 day' * p_days) as orders,
    CASE 
      WHEN COUNT(DISTINCT ci.id) = 0 THEN 0
      ELSE ROUND((SELECT COUNT(*)::DECIMAL FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.product_id = p.id AND o.created_at >= NOW() - INTERVAL '1 day' * p_days) / COUNT(DISTINCT ci.id) * 100, 2)
    END as rate
  FROM products p
  LEFT JOIN customer_interactions ci ON 
    ci.metadata->>'productId' = p.id::TEXT
    AND ci.created_at >= NOW() - INTERVAL '1 day' * p_days
  WHERE p.retailer_id = p_retailer_id
  AND p.is_active = true
  GROUP BY p.id, p.name
  HAVING COUNT(DISTINCT ci.id) > 0
  ORDER BY inquiries DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_engagement_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Retailers can only see their own data
DROP POLICY IF EXISTS retailer_whatsapp_messages ON whatsapp_messages;
CREATE POLICY retailer_whatsapp_messages ON whatsapp_messages
  FOR ALL USING (
    retailer_id IN (
      SELECT id FROM retailers WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS retailer_customer_interactions ON customer_interactions;
CREATE POLICY retailer_customer_interactions ON customer_interactions
  FOR ALL USING (
    retailer_id IN (
      SELECT id FROM retailers WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS retailer_engagement_metrics ON customer_engagement_metrics;
CREATE POLICY retailer_engagement_metrics ON customer_engagement_metrics
  FOR ALL USING (
    retailer_id IN (
      SELECT id FROM retailers WHERE id = auth.uid()
    )
  );

-- Comments for documentation
COMMENT ON TABLE whatsapp_messages IS 'Stores all WhatsApp conversations for customer engagement tracking and ghost shopper analysis';
COMMENT ON TABLE customer_interactions IS 'Tracks every customer action (product views, inquiries, orders) for analytics and conversion optimization';
COMMENT ON TABLE customer_engagement_metrics IS 'Pre-calculated metrics for dashboard performance - updated in real-time via triggers';
COMMENT ON FUNCTION calculate_ghost_shopper_score IS 'Identifies customers with high inquiry activity but low purchase conversion - the ghost shopper problem';
COMMENT ON FUNCTION get_ghost_shoppers IS 'Returns top ghost shoppers for targeted follow-up and re-engagement campaigns';
COMMENT ON FUNCTION get_conversion_rate IS 'Calculates inquiry-to-order conversion rate - key metric for measuring WhatsApp integration success';
COMMENT ON FUNCTION get_most_inquired_products IS 'Identifies products with high customer interest - signals for inventory decisions and marketing focus';
