-- Migration: Automated Customer Engagement & Retention
-- Purpose: Track engagement campaigns, automate messages, manage loyalty programs
-- Solves: "Seasonal fluctuations & dry spells" - keep customers engaged year-round

-- Table: engagement_campaigns
-- Define automated engagement campaigns (abandoned cart, win-back, new arrivals, etc.)
CREATE TABLE IF NOT EXISTS engagement_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign Keys
  retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
  
  -- Campaign Details
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN (
    'abandoned_cart',
    'win_back_inactive',
    'new_product_alert',
    'low_stock_urgency',
    'birthday_offer',
    'loyalty_reward',
    'seasonal_promotion',
    'ghost_shopper_reengagement',
    'first_purchase_followup',
    'repeat_purchase_incentive'
  )),
  
  -- Trigger Conditions
  trigger_conditions JSONB NOT NULL, -- When to send
  target_audience TEXT, -- 'all', 'inactive_30_days', 'high_value', 'ghost_shoppers', etc.
  
  -- Message Content
  message_template TEXT NOT NULL, -- WhatsApp message template with variables
  message_variables JSONB, -- Variables to replace in template
  
  -- Campaign Settings
  is_active BOOLEAN DEFAULT true,
  send_via TEXT DEFAULT 'whatsapp' CHECK (send_via IN ('whatsapp', 'sms', 'email')),
  max_sends_per_customer INTEGER DEFAULT 3, -- Prevent spam
  cooldown_days INTEGER DEFAULT 7, -- Days between sends to same customer
  
  -- Scheduling
  send_time TIME, -- Preferred time to send (e.g., 10:00 AM)
  send_days INTEGER[], -- Days of week (0=Sunday, 6=Saturday)
  
  -- Performance Tracking
  total_sent INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_converted INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_engagement_campaigns_retailer ON engagement_campaigns(retailer_id);
CREATE INDEX idx_engagement_campaigns_type ON engagement_campaigns(campaign_type);
CREATE INDEX idx_engagement_campaigns_active ON engagement_campaigns(is_active);

-- Table: engagement_sends
-- Track individual campaign sends to customers
CREATE TABLE IF NOT EXISTS engagement_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign Keys
  retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES engagement_campaigns(id) ON DELETE CASCADE,
  
  -- Send Details
  message_content TEXT NOT NULL,
  whatsapp_message_id TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_reason TEXT,
  
  -- Engagement Tracking
  clicked BOOLEAN DEFAULT false,
  clicked_at TIMESTAMPTZ,
  converted BOOLEAN DEFAULT false, -- Did they make a purchase?
  converted_at TIMESTAMPTZ,
  conversion_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_engagement_sends_retailer ON engagement_sends(retailer_id);
CREATE INDEX idx_engagement_sends_customer ON engagement_sends(customer_id);
CREATE INDEX idx_engagement_sends_campaign ON engagement_sends(campaign_id);
CREATE INDEX idx_engagement_sends_status ON engagement_sends(status);
CREATE INDEX idx_engagement_sends_created ON engagement_sends(created_at DESC);

-- Table: customer_segments
-- Group customers for targeted campaigns
CREATE TABLE IF NOT EXISTS customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign Keys
  retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
  
  -- Segment Details
  name TEXT NOT NULL,
  description TEXT,
  
  -- Segment Criteria
  criteria JSONB NOT NULL, -- SQL-like conditions for segmentation
  
  -- Stats
  customer_count INTEGER DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  avg_order_value DECIMAL(10, 2) DEFAULT 0,
  
  -- Auto-update
  auto_refresh BOOLEAN DEFAULT true,
  last_refreshed_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_customer_segments_retailer ON customer_segments(retailer_id);

-- Table: customer_segment_members
-- Junction table for segment membership
CREATE TABLE IF NOT EXISTS customer_segment_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign Keys
  segment_id UUID REFERENCES customer_segments(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Metadata
  added_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(segment_id, customer_id)
);

CREATE INDEX idx_segment_members_segment ON customer_segment_members(segment_id);
CREATE INDEX idx_segment_members_customer ON customer_segment_members(customer_id);

-- Table: abandoned_carts
-- Track abandoned order sessions for follow-up
CREATE TABLE IF NOT EXISTS abandoned_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign Keys
  retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Cart Details
  products JSONB NOT NULL, -- Array of {product_id, name, quantity, price}
  total_value DECIMAL(10, 2) NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'abandoned' CHECK (status IN ('abandoned', 'reminded', 'recovered', 'expired')),
  abandoned_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Follow-up
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMPTZ,
  recovered_at TIMESTAMPTZ,
  recovery_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_abandoned_carts_retailer ON abandoned_carts(retailer_id);
CREATE INDEX idx_abandoned_carts_customer ON abandoned_carts(customer_id);
CREATE INDEX idx_abandoned_carts_status ON abandoned_carts(status);
CREATE INDEX idx_abandoned_carts_created ON abandoned_carts(created_at DESC);

-- Function: Identify abandoned carts from order sessions
CREATE OR REPLACE FUNCTION identify_abandoned_carts(p_retailer_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_cart_count INTEGER := 0;
  v_interaction RECORD;
BEGIN
  -- Find order sessions that weren't completed (no order_created event)
  FOR v_interaction IN
    SELECT DISTINCT ON (customer_id)
      customer_id,
      metadata->'session' as session_data,
      created_at
    FROM customer_interactions
    WHERE retailer_id = p_retailer_id
    AND interaction_type = 'order_session_update'
    AND created_at >= NOW() - INTERVAL '24 hours'
    AND created_at <= NOW() - INTERVAL '1 hour' -- At least 1 hour old
    AND NOT EXISTS (
      SELECT 1 FROM customer_interactions ci2
      WHERE ci2.customer_id = customer_interactions.customer_id
      AND ci2.interaction_type = 'order_created'
      AND ci2.created_at > customer_interactions.created_at
      AND ci2.created_at <= NOW()
    )
    ORDER BY customer_id, created_at DESC
  LOOP
    -- Create abandoned cart record
    INSERT INTO abandoned_carts (
      retailer_id,
      customer_id,
      products,
      total_value,
      abandoned_at,
      metadata
    )
    SELECT
      p_retailer_id,
      v_interaction.customer_id,
      jsonb_build_array(
        jsonb_build_object(
          'product_id', v_interaction.session_data->>'productId',
          'product_name', v_interaction.session_data->>'productName',
          'quantity', (v_interaction.session_data->>'quantity')::INTEGER,
          'price', (v_interaction.session_data->>'price')::DECIMAL
        )
      ),
      (v_interaction.session_data->>'price')::DECIMAL * (v_interaction.session_data->>'quantity')::INTEGER,
      v_interaction.created_at,
      v_interaction.session_data
    ON CONFLICT DO NOTHING;
    
    v_cart_count := v_cart_count + 1;
  END LOOP;
  
  RETURN v_cart_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Get inactive customers (for win-back campaigns)
CREATE OR REPLACE FUNCTION get_inactive_customers(
  p_retailer_id UUID,
  p_days_inactive INTEGER DEFAULT 30,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  customer_id UUID,
  customer_name TEXT,
  phone_number TEXT,
  last_order_date TIMESTAMPTZ,
  days_inactive INTEGER,
  total_orders INTEGER,
  total_spent DECIMAL,
  preferred_categories TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.phone_number,
    c.last_order_date,
    EXTRACT(DAY FROM NOW() - c.last_order_date)::INTEGER,
    c.total_orders,
    c.total_spent,
    ARRAY(
      SELECT DISTINCT ci.metadata->>'category'
      FROM customer_interactions ci
      WHERE ci.customer_id = c.id
      AND ci.interaction_type = 'category_browsed'
      ORDER BY ci.metadata->>'category'
      LIMIT 3
    )
  FROM customers c
  WHERE c.retailer_id = p_retailer_id
  AND c.total_orders > 0
  AND c.last_order_date < NOW() - INTERVAL '1 day' * p_days_inactive
  AND c.whatsapp_active = true
  ORDER BY c.total_spent DESC, c.last_order_date DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Get ghost shoppers (high engagement, no purchase)
CREATE OR REPLACE FUNCTION get_ghost_shoppers_for_engagement(
  p_retailer_id UUID,
  p_min_inquiries INTEGER DEFAULT 5,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  customer_id UUID,
  customer_name TEXT,
  phone_number TEXT,
  inquiry_count INTEGER,
  view_count INTEGER,
  last_interaction TIMESTAMPTZ,
  interested_products JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.phone_number,
    COUNT(DISTINCT ci.id) FILTER (WHERE ci.interaction_type IN ('product_inquiry', 'product_viewed'))::INTEGER,
    COUNT(DISTINCT ci.id) FILTER (WHERE ci.interaction_type = 'product_viewed')::INTEGER,
    MAX(ci.created_at),
    jsonb_agg(DISTINCT ci.metadata->'productName') FILTER (WHERE ci.metadata ? 'productName')
  FROM customers c
  JOIN customer_interactions ci ON ci.customer_id = c.id
  WHERE c.retailer_id = p_retailer_id
  AND c.total_orders = 0
  AND ci.created_at >= NOW() - INTERVAL '60 days'
  AND c.whatsapp_active = true
  GROUP BY c.id, c.name, c.phone_number
  HAVING COUNT(DISTINCT ci.id) FILTER (WHERE ci.interaction_type IN ('product_inquiry', 'product_viewed')) >= p_min_inquiries
  ORDER BY COUNT(DISTINCT ci.id) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Send engagement campaign
CREATE OR REPLACE FUNCTION send_engagement_campaign(p_campaign_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_campaign RECORD;
  v_customer RECORD;
  v_send_count INTEGER := 0;
  v_message TEXT;
BEGIN
  -- Get campaign details
  SELECT * INTO v_campaign
  FROM engagement_campaigns
  WHERE id = p_campaign_id
  AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign not found or inactive';
  END IF;
  
  -- Get target customers based on campaign type
  FOR v_customer IN
    SELECT c.*
    FROM customers c
    WHERE c.retailer_id = v_campaign.retailer_id
    AND c.whatsapp_active = true
    AND c.whatsapp_opt_in = true
    -- Cooldown check
    AND NOT EXISTS (
      SELECT 1 FROM engagement_sends es
      WHERE es.customer_id = c.id
      AND es.campaign_id = p_campaign_id
      AND es.created_at >= NOW() - INTERVAL '1 day' * v_campaign.cooldown_days
    )
    -- Max sends check
    AND (
      SELECT COUNT(*) FROM engagement_sends es
      WHERE es.customer_id = c.id
      AND es.campaign_id = p_campaign_id
    ) < v_campaign.max_sends_per_customer
    LIMIT 100  -- Process in batches
  LOOP
    -- Personalize message
    v_message := replace(v_campaign.message_template, '{{name}}', v_customer.name);
    
    -- Create send record
    INSERT INTO engagement_sends (
      retailer_id,
      customer_id,
      campaign_id,
      message_content,
      status
    ) VALUES (
      v_campaign.retailer_id,
      v_customer.id,
      p_campaign_id,
      v_message,
      'pending'
    );
    
    v_send_count := v_send_count + 1;
  END LOOP;
  
  -- Update campaign stats
  UPDATE engagement_campaigns
  SET total_sent = total_sent + v_send_count
  WHERE id = p_campaign_id;
  
  RETURN v_send_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate customer lifetime value (CLV)
CREATE OR REPLACE FUNCTION calculate_customer_clv(p_customer_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_clv DECIMAL;
BEGIN
  -- Simple CLV: Average order value * Purchase frequency * Average customer lifespan
  SELECT 
    AVG(o.total_amount) * 
    (COUNT(o.id) / NULLIF(EXTRACT(MONTH FROM MAX(o.created_at) - MIN(o.created_at)), 0)) *
    12  -- Assume 12-month retention
  INTO v_clv
  FROM orders o
  WHERE o.customer_id = p_customer_id
  AND o.status != 'cancelled';
  
  RETURN COALESCE(v_clv, 0);
END;
$$ LANGUAGE plpgsql;

-- Trigger: Track engagement send status changes
CREATE OR REPLACE FUNCTION update_engagement_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update campaign stats when send status changes
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    UPDATE engagement_campaigns
    SET total_opened = total_opened + 1
    WHERE id = NEW.campaign_id;
  END IF;
  
  IF NEW.clicked = true AND OLD.clicked = false THEN
    UPDATE engagement_campaigns
    SET total_clicked = total_clicked + 1
    WHERE id = NEW.campaign_id;
  END IF;
  
  IF NEW.converted = true AND OLD.converted = false THEN
    UPDATE engagement_campaigns
    SET total_converted = total_converted + 1
    WHERE id = NEW.campaign_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_engagement_send_update ON engagement_sends;
CREATE TRIGGER on_engagement_send_update
  AFTER UPDATE ON engagement_sends
  FOR EACH ROW
  EXECUTE FUNCTION update_engagement_campaign_stats();

-- Row Level Security
ALTER TABLE engagement_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_segment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE abandoned_carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS retailer_engagement_campaigns ON engagement_campaigns;
CREATE POLICY retailer_engagement_campaigns ON engagement_campaigns
  FOR ALL USING (
    retailer_id IN (SELECT id FROM retailers WHERE email = auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS retailer_engagement_sends ON engagement_sends;
CREATE POLICY retailer_engagement_sends ON engagement_sends
  FOR ALL USING (
    retailer_id IN (SELECT id FROM retailers WHERE email = auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS retailer_customer_segments ON customer_segments;
CREATE POLICY retailer_customer_segments ON customer_segments
  FOR ALL USING (
    retailer_id IN (SELECT id FROM retailers WHERE email = auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS retailer_segment_members ON customer_segment_members;
CREATE POLICY retailer_segment_members ON customer_segment_members
  FOR ALL USING (
    segment_id IN (
      SELECT id FROM customer_segments WHERE retailer_id IN (
        SELECT id FROM retailers WHERE email = auth.jwt() ->> 'email'
      )
    )
  );

DROP POLICY IF EXISTS retailer_abandoned_carts ON abandoned_carts;
CREATE POLICY retailer_abandoned_carts ON abandoned_carts
  FOR ALL USING (
    retailer_id IN (SELECT id FROM retailers WHERE email = auth.jwt() ->> 'email')
  );

-- Comments
COMMENT ON TABLE engagement_campaigns IS 'Automated customer engagement campaigns - abandoned cart, win-back, new products, loyalty';
COMMENT ON TABLE engagement_sends IS 'Track individual campaign message sends and customer responses';
COMMENT ON TABLE customer_segments IS 'Customer groupings for targeted marketing (VIP, inactive, ghost shoppers, etc.)';
COMMENT ON TABLE abandoned_carts IS 'Track abandoned order sessions for recovery campaigns';
COMMENT ON FUNCTION identify_abandoned_carts IS 'Identifies order sessions that were started but not completed';
COMMENT ON FUNCTION get_inactive_customers IS 'Returns customers who haven t ordered in X days - for win-back campaigns';
COMMENT ON FUNCTION get_ghost_shoppers_for_engagement IS 'Returns high-engagement customers with no purchases - for conversion campaigns';
