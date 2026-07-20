-- Fashion Retail Platform - Initial Schema
-- Creates all tables with Row Level Security policies
-- This schema is fully idempotent and can be safely re-run

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types/enums (only if they don't exist)
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'processing', 'fulfilled', 'delivered', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'partial', 'paid', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE message_type AS ENUM ('text', 'image', 'interactive', 'template');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE loyalty_transaction_type AS ENUM ('earn', 'redeem', 'expire', 'adjustment');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- RETAILERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS retailers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Auth (links to auth.users)
  email TEXT NOT NULL UNIQUE,
  
  -- Business Information
  business_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  business_address TEXT,
  logo_url TEXT,
  
  -- Settings
  currency TEXT NOT NULL DEFAULT 'XAF',
  timezone TEXT NOT NULL DEFAULT 'Africa/Douala',
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_retailers_email ON retailers(email);
CREATE INDEX IF NOT EXISTS idx_retailers_is_active ON retailers(is_active);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_retailers_updated_at ON retailers;
CREATE TRIGGER update_retailers_updated_at
  BEFORE UPDATE ON retailers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PRODUCTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign Keys
  retailer_id UUID NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
  
  -- Product Information
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  
  -- Pricing
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'XAF',
  
  -- Inventory
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 10 CHECK (low_stock_threshold >= 0),
  
  -- Product Codes
  sku TEXT,
  barcode TEXT,
  
  -- Media and Attributes
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  sizes TEXT[] DEFAULT ARRAY[]::TEXT[],
  colors TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_retailer_id ON products(retailer_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_stock_quantity ON products(stock_quantity);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku) WHERE sku IS NOT NULL;

-- Trigger
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CUSTOMERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign Keys
  retailer_id UUID NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
  
  -- Customer Information (auto-created from WhatsApp)
  phone_number TEXT NOT NULL,
  name TEXT,
  email TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  
  -- Statistics
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_spent DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (total_spent >= 0),
  last_order_date TIMESTAMPTZ,
  
  -- Notes and Tags
  notes TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Unique constraint: one customer per phone per retailer
  UNIQUE(retailer_id, phone_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_retailer_id ON customers(retailer_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone_number ON customers(phone_number);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_tags ON customers USING GIN(tags);

-- Trigger
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ORDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign Keys
  retailer_id UUID NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Order Information
  order_number TEXT NOT NULL UNIQUE,
  status order_status NOT NULL DEFAULT 'pending',
  
  -- Pricing
  total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'XAF',
  
  -- Payment
  payment_status payment_status NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  
  -- Delivery
  delivery_address TEXT,
  delivery_notes TEXT,
  
  -- Status Timestamps
  fulfilled_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_retailer_id ON orders(retailer_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- Trigger
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ORDER ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign Keys
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  
  -- Item Details
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
  subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
  
  -- Product Attributes (snapshot at time of order)
  size TEXT,
  color TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- =====================================================
-- MESSAGES TABLE (WhatsApp Conversation History)
-- =====================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign Keys
  retailer_id UUID NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Message Details
  direction message_direction NOT NULL,
  message_type message_type NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  whatsapp_message_id TEXT,
  status message_status NOT NULL DEFAULT 'sent',
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_retailer_id ON messages(retailer_id);
CREATE INDEX IF NOT EXISTS idx_messages_customer_id ON messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);
CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_message_id ON messages(whatsapp_message_id) WHERE whatsapp_message_id IS NOT NULL;

-- =====================================================
-- LOYALTY PROGRAMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS loyalty_programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign Keys
  retailer_id UUID NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
  
  -- Program Information
  name TEXT NOT NULL,
  description TEXT,
  
  -- Points Configuration
  points_per_currency DECIMAL(10, 2) NOT NULL DEFAULT 1 CHECK (points_per_currency > 0),
  currency_per_point DECIMAL(10, 2) NOT NULL DEFAULT 1 CHECK (currency_per_point > 0),
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Rules (JSON structure for flexibility)
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_programs_retailer_id ON loyalty_programs(retailer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_programs_is_active ON loyalty_programs(is_active);

-- Trigger
DROP TRIGGER IF EXISTS update_loyalty_programs_updated_at ON loyalty_programs;
CREATE TRIGGER update_loyalty_programs_updated_at
  BEFORE UPDATE ON loyalty_programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- LOYALTY POINTS TABLE (Customer Points Balance)
-- =====================================================
CREATE TABLE IF NOT EXISTS loyalty_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign Keys
  retailer_id UUID NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Points Information
  points_balance INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  lifetime_points INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_points >= 0),
  points_redeemed INTEGER NOT NULL DEFAULT 0 CHECK (points_redeemed >= 0),
  
  -- Tier Information
  tier TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Unique constraint: one points record per customer per retailer
  UNIQUE(retailer_id, customer_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_points_retailer_id ON loyalty_points(retailer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_customer_id ON loyalty_points(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_balance ON loyalty_points(points_balance DESC);

-- =====================================================
-- LOYALTY TRANSACTIONS TABLE (Points History)
-- =====================================================
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign Keys
  retailer_id UUID NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Transaction Details
  points_change INTEGER NOT NULL,
  transaction_type loyalty_transaction_type NOT NULL,
  
  -- Reference (e.g., order_id for earn/redeem)
  reference_id TEXT,
  reference_type TEXT,
  
  -- Description
  description TEXT NOT NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_retailer_id ON loyalty_transactions(retailer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer_id ON loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_created_at ON loyalty_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_type ON loyalty_transactions(transaction_type);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE retailers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- Retailers Policies
DROP POLICY IF EXISTS "Retailers can view their own data" ON retailers;
CREATE POLICY "Retailers can view their own data"
  ON retailers FOR SELECT
  USING (auth.uid()::text = id::text OR email = auth.jwt() ->> 'email');

DROP POLICY IF EXISTS "Retailers can update their own data" ON retailers;
CREATE POLICY "Retailers can update their own data"
  ON retailers FOR UPDATE
  USING (auth.uid()::text = id::text OR email = auth.jwt() ->> 'email');

-- Products Policies
DROP POLICY IF EXISTS "Retailers can view their own products" ON products;
CREATE POLICY "Retailers can view their own products"
  ON products FOR SELECT
  USING (retailer_id IN (SELECT id FROM retailers WHERE email = auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Retailers can insert their own products" ON products;
CREATE POLICY "Retailers can insert their own products"
  ON products FOR INSERT
  WITH CHECK (retailer_id IN (SELECT id FROM retailers WHERE email = auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Retailers can update their own products" ON products;
CREATE POLICY "Retailers can update their own products"
  ON products FOR UPDATE
  USING (retailer_id IN (SELECT id FROM retailers WHERE email = auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Retailers can delete their own products" ON products;
CREATE POLICY "Retailers can delete their own products"
  ON products FOR DELETE
  USING (retailer_id IN (SELECT id FROM retailers WHERE email = auth.jwt() ->> 'email'));

-- Customers Policies
DROP POLICY IF EXISTS "Retailers can view their own customers" ON customers;
CREATE POLICY "Retailers can view their own customers"
  ON customers FOR SELECT
  USING (retailer_id IN (SELECT id FROM retailers WHERE email = auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Retailers can insert their own customers" ON customers;
CREATE POLICY "Retailers can insert their own customers"
  ON customers FOR INSERT
  WITH CHECK (retailer_id IN (SELECT id FROM retailers WHERE email = auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Retailers can update their own customers" ON customers;
CREATE POLICY "Retailers can update their own customers"
  ON customers FOR UPDATE
  USING (retailer_id IN (SELECT id FROM retailers WHERE email = auth.jwt() ->> 'email'));

-- Orders Policies
DROP POLICY IF EXISTS "Retailers can view their own orders" ON orders;
CREATE POLICY "Retailers can view their own orders"
  ON orders FOR SELECT
  USING (retailer_id IN (SELECT id FROM retailers WHERE email = auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Retailers can insert their own orders" ON orders;
CREATE POLICY "Retailers can insert their own orders"
  ON orders FOR INSERT
  WITH CHECK (retailer_id IN (SELECT id FROM retailers WHERE email = auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Retailers can update their own orders" ON orders;
CREATE POLICY "Retailers can update their own orders"
  ON orders FOR UPDATE
  USING (retailer_id IN (SELECT id FROM retailers WHERE email = auth.jwt() ->> 'email'));

-- Order Items Policies
DROP POLICY IF EXISTS "Retailers can view order items for their orders" ON order_items;
CREATE POLICY "Retailers can view order items for their orders"
  ON order_items FOR SELECT
  USING (order_id IN (
    SELECT id FROM orders WHERE retailer_id IN (
      SELECT id FROM retailers WHERE email = auth.jwt() ->> 'email'
    )
  ));

DROP POLICY IF EXISTS "Retailers can insert order items for their orders" ON order_items;
CREATE POLICY "Retailers can insert order items for their orders"
  ON order_items FOR INSERT
  WITH CHECK (order_id IN (
    SELECT id FROM orders WHERE retailer_id IN (
      SELECT id FROM retailers WHERE email = auth.jwt() ->> 'email'
    )
  ));

-- Messages Policies
DROP POLICY IF EXISTS "Retailers can view their own messages" ON messages;
CREATE POLICY "Retailers can view their own messages"
  ON messages FOR SELECT
  USING (retailer_id IN (SELECT id FROM retailers WHERE email = auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Retailers can insert their own messages" ON messages;
CREATE POLICY "Retailers can insert their own messages"
  ON messages FOR INSERT
  WITH CHECK (retailer_id IN (SELECT id FROM retailers WHERE email = auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Retailers can update their own messages" ON messages;
CREATE POLICY "Retailers can update their own messages"
  ON messages FOR UPDATE
  USING (retailer_id IN (SELECT id FROM retailers WHERE email = auth.jwt() ->> 'email'));

-- Loyalty Programs Policies
DROP POLICY IF EXISTS "Retailers can view their own loyalty programs" ON loyalty_programs;
CREATE POLICY "Retailers can view their own loyalty programs"
  ON loyalty_programs FOR SELECT
  USING (retailer_id IN (SELECT id FROM retailers WHERE email = auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Retailers can manage their own loyalty programs" ON loyalty_programs;
CREATE POLICY "Retailers can manage their own loyalty programs"
  ON loyalty_programs FOR ALL
  USING (retailer_id IN (SELECT id FROM retailers WHERE email = auth.jwt() ->> 'email'));

-- Loyalty Points Policies
DROP POLICY IF EXISTS "Retailers can view their customers' loyalty points" ON loyalty_points;
CREATE POLICY "Retailers can view their customers' loyalty points"
  ON loyalty_points FOR SELECT
  USING (retailer_id IN (SELECT id FROM retailers WHERE email = auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Retailers can manage their customers' loyalty points" ON loyalty_points;
CREATE POLICY "Retailers can manage their customers' loyalty points"
  ON loyalty_points FOR ALL
  USING (retailer_id IN (SELECT id FROM retailers WHERE email = auth.jwt() ->> 'email'));

-- Loyalty Transactions Policies
DROP POLICY IF EXISTS "Retailers can view their loyalty transactions" ON loyalty_transactions;
CREATE POLICY "Retailers can view their loyalty transactions"
  ON loyalty_transactions FOR SELECT
  USING (retailer_id IN (SELECT id FROM retailers WHERE email = auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Retailers can insert loyalty transactions" ON loyalty_transactions;
CREATE POLICY "Retailers can insert loyalty transactions"
  ON loyalty_transactions FOR INSERT
  WITH CHECK (retailer_id IN (SELECT id FROM retailers WHERE email = auth.jwt() ->> 'email'));

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to automatically create retailer on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO retailers (id, email, business_name, phone_number, whatsapp_number)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Fashion Store'),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    COALESCE(NEW.raw_user_meta_data->>'whatsapp_number', '')
  )
  ON CONFLICT (email) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Function to update customer statistics on new order
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE customers
  SET 
    total_orders = total_orders + 1,
    total_spent = total_spent + NEW.total_amount,
    last_order_date = NEW.created_at
  WHERE id = NEW.customer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_order_created ON orders;
CREATE TRIGGER on_order_created
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_stats();

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to decrement product stock
CREATE OR REPLACE FUNCTION decrement_stock(product_id UUID, quantity INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET stock_quantity = GREATEST(stock_quantity - quantity, 0)
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment product stock (for cancellations/returns)
CREATE OR REPLACE FUNCTION increment_stock(product_id UUID, quantity INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET stock_quantity = stock_quantity + quantity
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
