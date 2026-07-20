# Supabase MVP Setup Guide - Simple & Easy Signup

## Step 1: Disable Email Confirmation (Required!)

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project: **AWS Re:Deploy**
3. Go to **Authentication** → **Providers**
4. Click on **Email** provider
5. **UNCHECK** ☐ "Confirm email"
6. Click **Save**

✅ This allows users to sign up instantly without email verification

---

## Step 2: Run Database Setup SQL

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New query**
3. Copy and paste the entire content of `supabase_setup.sql`
4. Click **Run** (or press Cmd+Enter)

### What This Creates:

**`retailers` table:**
- `id` - Links to auth user
- `business_name` - Store name
- `email` - Contact email
- `phone_number` - Phone number
- `whatsapp_number` - WhatsApp for customer communication
- `created_at`, `updated_at` - Timestamps

**Automatic Profile Creation:**
- When a user signs up, their profile is automatically created in the `retailers` table
- No extra steps needed!

**Security (RLS):**
- Users can only see and edit their own data
- No user can access another user's information

---

## Step 3: Verify Setup

### Check if table was created:
1. Go to **Table Editor** in Supabase Dashboard
2. You should see the **`retailers`** table

### Check if trigger works:
1. Try signing up with a test account
2. Go to **Table Editor** → **retailers**
3. You should see your new account data there

---

## Step 4: Test Signup Flow

1. Open http://localhost:8085
2. Click "Create Account" / Go to Signup
3. Fill in:
   - Business Name: **Test Store**
   - Email: **test@example.com**
   - Phone: **+237690709635**
   - WhatsApp: **+237690709635**
   - Password: **Test123456**
   - Confirm Password: **Test123456**
4. Click **CREATE ACCOUNT**

**Expected Result:**
- ✅ Account created instantly
- ✅ No email confirmation needed
- ✅ User data saved in `retailers` table
- ✅ Success message shown
- ✅ Redirected to login page

---

## Troubleshooting

### "Email rate limit exceeded"
- Supabase free tier limits: 4 emails per hour
- **Solution**: Disable email confirmation (Step 1)

### "User already registered"
- Email is already in use
- **Solution**: Use a different email or delete the user from **Authentication** → **Users**

### "500 Internal Server Error"
- Database trigger might have failed
- **Solution**: 
  1. Check **Logs** → **Auth Logs** for detailed error
  2. Make sure you ran the SQL setup (Step 2)
  3. Verify the trigger exists: **Database** → **Triggers**

### Profile not created in retailers table
- Check **Logs** → **Postgres Logs**
- Make sure the trigger is active
- Verify the function exists: **Database** → **Functions**

---

## Current Configuration

**Project:** AWS Re:Deploy  
**Project ID:** `yymfeyslutfcucapyhtj`  
**URL:** `https://yymfeyslutfcucapyhtj.supabase.co`

**Database Tables:**
- ✅ `auth.users` (built-in - manages authentication)
- ✅ `public.retailers` (custom - stores business data)

**Auth Settings:**
- ✅ Email provider: **Enabled**
- ✅ Email confirmation: **Disabled** (for MVP)
- ✅ Signup: **Enabled**

---

## Next Steps After Signup Works

Once basic signup is working, you can add:

1. **Products table** - manage inventory
2. **Orders table** - track sales
3. **Customers table** - customer database
4. **Messages table** - WhatsApp communication history

But for now, focus on getting signup working! 🚀

---

## Quick Reference

**Run SQL Setup:**
```bash
# Copy supabase_setup.sql content and run in Supabase SQL Editor
```

**Test Credentials:**
- Email: test@example.com
- Password: Test123456

**Check Logs:**
- Auth Logs: Authentication → Logs
- Postgres Logs: Database → Logs

**View Data:**
- Users: Authentication → Users
- Retailers: Table Editor → retailers
