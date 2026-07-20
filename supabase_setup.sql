-- Fashion Retail Platform - Simple MVP Database Setup
-- Run this in Supabase SQL Editor

-- 1. Create retailers table (stores business information)
CREATE TABLE IF NOT EXISTS public.retailers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.retailers ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies - Users can only see/edit their own data
CREATE POLICY "Users can view own retailer data"
  ON public.retailers
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own retailer data"
  ON public.retailers
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own retailer data"
  ON public.retailers
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 4. Create function to auto-create retailer profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.retailers (id, business_name, email, phone_number, whatsapp_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    COALESCE(NEW.raw_user_meta_data->>'whatsapp_number', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger to call the function on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6. Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.retailers TO authenticated;
GRANT SELECT ON public.retailers TO anon;

-- Done! Your MVP database is ready.
-- Next steps:
-- 1. Go to Supabase Dashboard → Authentication → Providers → Email
-- 2. DISABLE "Confirm email" for easy signup
-- 3. Make sure "Enable email signups" is ON
