-- Diagnostic queries to find the blank screen issue

-- 1. Check if the trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_schema,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 2. Check if the function exists
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'handle_new_user'
  AND routine_schema = 'public';

-- 3. Check auth.users table (should have users)
SELECT 
  id,
  email,
  created_at,
  raw_user_meta_data->>'business_name' as business_name,
  raw_user_meta_data->>'phone_number' as phone_number
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check retailers table (should match auth.users)
SELECT 
  id,
  email,
  business_name,
  phone_number,
  whatsapp_number,
  created_at
FROM retailers
ORDER BY created_at DESC
LIMIT 5;

-- 5. Find users without retailer records (THIS IS THE PROBLEM)
SELECT 
  u.id,
  u.email,
  u.created_at,
  u.raw_user_meta_data->>'business_name' as meta_business_name,
  r.id as retailer_id
FROM auth.users u
LEFT JOIN retailers r ON u.id = r.id
WHERE r.id IS NULL;

-- 6. Check RLS policies on retailers table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'retailers';
