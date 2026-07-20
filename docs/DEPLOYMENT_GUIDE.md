# Deployment Guide

## Fashion Retail Platform for Cameroon

Complete guide for deploying the Fashion Retail Platform with React Native mobile app, Supabase backend, and WhatsApp integration.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Supabase Setup](#supabase-setup)
4. [WhatsApp Cloud API Setup](#whatsapp-cloud-api-setup)
5. [Mobile App Deployment](#mobile-app-deployment)
6. [Testing](#testing)
7. [Production Checklist](#production-checklist)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts

- [x] **Supabase Account** - [supabase.com](https://supabase.com)
- [x] **Meta Developer Account** - [developers.facebook.com](https://developers.facebook.com)
- [x] **Expo Account** - [expo.dev](https://expo.dev) (for mobile deployment)
- [ ] **Apple Developer** - Required for iOS (optional, $99/year)
- [ ] **Google Play Console** - Required for Android (optional, $25 one-time)

### Development Tools

```bash
# Node.js (v18+)
node --version  # Should be 18.0.0 or higher

# pnpm
npm install -g pnpm

# Supabase CLI
brew install supabase/tap/supabase  # macOS
# or
npm install -g supabase

# Expo CLI
npm install -g expo-cli

# EAS CLI (for app builds)
npm install -g eas-cli
```

---

## Environment Setup

### 1. Clone and Install

```bash
# Navigate to project
cd /Users/azilnwi/Documents/AWSredeploy/FASHION

# Install dependencies
pnpm install

# Install mobile app dependencies
cd apps/mobile
pnpm install
cd ../..
```

### 2. Configure Environment Variables

**Root `.env`:**
```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# WhatsApp Cloud API
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-account-id
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_VERIFY_TOKEN=your-verify-token
WHATSAPP_WEBHOOK_SECRET=your-webhook-secret

# Payment Providers (MVP: use "test")
MTN_MOMO_API_KEY=test
ORANGE_MONEY_API_KEY=test

# OpenAI (Optional - for AI recommendations)
OPENAI_API_KEY=your-openai-key  # Optional, fallback to rule-based
```

**Mobile App `.env`** (`apps/mobile/.env`):
```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Supabase Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization
4. Set project name: `fashion-retail-cm`
5. Set database password (save this!)
6. Choose region: **Frankfurt (eu-central-1)** (closest to Cameroon)
7. Wait for project creation (~2 minutes)

### 2. Get Project Credentials

```bash
# From Supabase Dashboard → Settings → API

# Project URL
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co

# Anon/Public Key (safe for client-side)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service Role Key (keep secret!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Run Database Migrations

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref xxxxxxxxxxxxx

# Push database schema
supabase db push

# Verify tables created
supabase db dump --schema public
```

**Expected Tables:**
- retailers (9 records max initially)
- products
- customers
- orders
- order_items
- messages
- loyalty_programs
- loyalty_points
- loyalty_transactions

### 4. Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy whatsapp-webhook
supabase functions deploy send-whatsapp-message
supabase functions deploy process-payment

# Set environment variables
supabase secrets set WHATSAPP_ACCESS_TOKEN=your_token
supabase secrets set WHATSAPP_VERIFY_TOKEN=your_verify_token
supabase secrets set MTN_MOMO_API_KEY=test
supabase secrets set ORANGE_MONEY_API_KEY=test

# Verify deployment
supabase functions list
```

### 5. Configure Storage (Optional)

For product images:

```bash
# Create storage bucket
supabase storage create-bucket products --public

# Set CORS policy
supabase storage update-bucket products \
  --public \
  --allowed-origins "*"
```

---

## WhatsApp Cloud API Setup

### 1. Create Meta App

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click "My Apps" → "Create App"
3. Select "Business" type
4. Fill in app details:
   - **Name:** Fashion Retail Platform
   - **Email:** your@email.com
5. Click "Create App"

### 2. Add WhatsApp Product

1. In app dashboard, click "Add Product"
2. Find "WhatsApp" → Click "Set Up"
3. Select or create Business Account
4. Choose phone number or register new one

### 3. Get API Credentials

```bash
# From WhatsApp → API Setup

# Phone Number ID
WHATSAPP_PHONE_NUMBER_ID=123456789012345

# Business Account ID
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345

# Temporary Access Token (24h)
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxx
```

### 4. Generate Permanent Token

1. Go to Meta Business Suite
2. Settings → Business Settings
3. System Users → Create System User
4. Name: "Fashion Platform Production"
5. Role: Admin
6. Generate Token:
   - App: Your WhatsApp App
   - Permissions: `whatsapp_business_messaging`, `whatsapp_business_management`
   - Duration: Never expire
7. Save token securely

### 5. Configure Webhook

```bash
# Your webhook URL
https://your-project.supabase.co/functions/v1/whatsapp-webhook

# Verify token (create your own)
my-secure-verify-token-123

# Subscribe to fields:
- messages
- message_status (optional)
```

**Steps:**
1. WhatsApp → Configuration
2. Webhook → Edit
3. Callback URL: Your Edge Function URL
4. Verify Token: Your chosen token
5. Click "Verify and Save"
6. Subscribe to `messages` field

### 6. Test Webhook

```bash
# Send test message from your WhatsApp
"Hello"

# Check Supabase logs
supabase functions logs whatsapp-webhook --tail

# Should see: "Received message: Hello"
```

---

## Mobile App Deployment

### 1. Configure Expo

```bash
cd apps/mobile

# Login to Expo
expo login

# Initialize EAS (Expo Application Services)
eas init

# Configure app.json
```

Update `app.json`:
```json
{
  "expo": {
    "name": "Fashion Retail",
    "slug": "fashion-retail-cm",
    "version": "1.0.0",
    "owner": "your-expo-username",
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    },
    "ios": {
      "bundleIdentifier": "com.yourcompany.fashionretail"
    },
    "android": {
      "package": "com.yourcompany.fashionretail"
    }
  }
}
```

### 2. Development Build

Test on your device:

```bash
# Start dev server
pnpm run start

# Scan QR code with:
# - Expo Go app (iOS/Android)
# - Camera app (iOS only)

# Or run on simulator
pnpm run ios     # iOS Simulator (macOS only)
pnpm run android # Android Emulator
```

### 3. Production Build

#### Android (APK)

```bash
# Build APK
eas build --platform android --profile preview

# Download and install on device
# Or upload to Google Play Console
```

#### iOS (TestFlight)

```bash
# Build for TestFlight
eas build --platform ios --profile preview

# Submit to TestFlight
eas submit --platform ios
```

**Note:** iOS requires Apple Developer account ($99/year)

### 4. Over-The-Air (OTA) Updates

For quick updates without rebuilding:

```bash
# Publish update
eas update --branch production --message "Fix order display bug"

# Users get update automatically on next app launch
```

---

## Testing

### Unit Tests

```bash
# Run all tests
pnpm run test

# Run mobile tests
cd apps/mobile
pnpm run test
```

### End-to-End Testing

**1. User Signup Flow:**
```bash
1. Open mobile app
2. Click "Sign Up"
3. Enter:
   - Business Name: "Test Store"
   - Email: test@example.com
   - Phone: +237670000000
   - WhatsApp: +237670000000
4. Verify account created in Supabase Dashboard
```

**2. Product Management:**
```bash
1. Login to app
2. Go to Products tab
3. Click "+" to add product
4. Fill details, add image
5. Save and verify in list
```

**3. WhatsApp Order Flow:**
```bash
1. Send "hi" to your WhatsApp number
2. Bot should respond with menu
3. Reply "products"
4. Browse and select items
5. Complete order
6. Verify order appears in mobile app
```

**4. Payment Testing (MVP Stub):**
```bash
1. Create order via WhatsApp
2. Check order in app → Shows "Pending"
3. In future: Test with sandbox APIs
```

### Load Testing

```bash
# Test WhatsApp webhook
for i in {1..10}; do
  curl -X POST \
    https://your-project.supabase.co/functions/v1/whatsapp-webhook \
    -H "Content-Type: application/json" \
    -d '{"entry":[{"changes":[{"value":{"messages":[{"from":"+237670000000","text":{"body":"test"},"timestamp":"1234567890"}]}}]}]}'
done
```

---

## Production Checklist

### Security ✅

- [ ] Change all default passwords
- [ ] Enable 2FA on all accounts (Supabase, Meta, Expo)
- [ ] Rotate API keys and tokens
- [ ] Review Row Level Security policies
- [ ] Enable Supabase Auth email confirmations
- [ ] Set up domain for API (custom domain for webhooks)
- [ ] Configure CORS properly
- [ ] Enable rate limiting on Edge Functions
- [ ] Audit database permissions
- [ ] Implement API request logging

### Performance ⚡

- [ ] Enable Supabase connection pooling
- [ ] Add database indexes (already in schema)
- [ ] Configure image optimization for product photos
- [ ] Set up CDN for static assets
- [ ] Enable Supabase Realtime only for needed tables
- [ ] Optimize mobile app bundle size
- [ ] Enable Hermes JS engine (React Native)
- [ ] Implement pagination for large lists

### Monitoring 📊

- [ ] Set up Supabase monitoring dashboard
- [ ] Configure error tracking (Sentry)
- [ ] Enable WhatsApp webhook logging
- [ ] Set up uptime monitoring (UptimeRobot)
- [ ] Create alerts for critical errors
- [ ] Track payment success rates
- [ ] Monitor order completion rates
- [ ] Set up customer support system

### Compliance 📜

- [ ] Privacy Policy (GDPR, data protection)
- [ ] Terms of Service
- [ ] Cookie Policy (if using web)
- [ ] Cameroon business registration
- [ ] Tax compliance (VAT if applicable)
- [ ] WhatsApp Business policy compliance
- [ ] Payment provider agreements

### Backup & Recovery 💾

- [ ] Enable Supabase daily backups
- [ ] Test database restore process
- [ ] Document disaster recovery plan
- [ ] Set up off-site backup storage
- [ ] Create runbook for common issues

---

## Troubleshooting

### Common Issues

**Issue:** "Failed to connect to Supabase"  
**Solution:**
```bash
# Check environment variables
echo $EXPO_PUBLIC_SUPABASE_URL
echo $EXPO_PUBLIC_SUPABASE_ANON_KEY

# Verify URL is accessible
curl https://your-project.supabase.co

# Check API key in Supabase Dashboard → Settings → API
```

**Issue:** WhatsApp webhook not receiving messages  
**Solution:**
```bash
# Verify webhook URL
curl https://your-project.supabase.co/functions/v1/whatsapp-webhook

# Check Edge Function logs
supabase functions logs whatsapp-webhook

# Verify webhook subscription in Meta Developer Console
```

**Issue:** Orders not appearing in app  
**Solution:**
```bash
# Check RLS policies
supabase db dump --schema public | grep POLICY

# Verify user authentication
# Check Supabase Dashboard → Authentication → Users

# Test query directly
supabase db query "SELECT * FROM orders LIMIT 5"
```

**Issue:** Mobile app build fails  
**Solution:**
```bash
# Clear cache
rm -rf node_modules
pnpm install

# Clear Expo cache
expo start -c

# Check for expo-cli updates
npm install -g expo-cli@latest
```

### Support Resources

- **Supabase Docs:** https://supabase.com/docs
- **Expo Docs:** https://docs.expo.dev
- **WhatsApp Cloud API:** https://developers.facebook.com/docs/whatsapp
- **Community:** GitHub Issues, Discord channels

---

## Maintenance

### Regular Tasks

**Daily:**
- Monitor error logs
- Check WhatsApp message delivery
- Review new orders

**Weekly:**
- Database backup verification
- API usage review (avoid quota limits)
- Customer feedback review
- Update content (product catalog)

**Monthly:**
- Security audit
- Performance review
- Cost optimization
- Feature requests prioritization
- API key rotation (security best practice)

**Quarterly:**
- Dependency updates
- Platform updates (Expo SDK, React Native)
- User analytics review
- Business metrics analysis

---

## Scaling Considerations

### Database

```sql
-- Add indexes for slow queries
CREATE INDEX CONCURRENTLY idx_orders_created_at_retailer 
ON orders(retailer_id, created_at DESC);

-- Partition large tables
CREATE TABLE orders_2024 PARTITION OF orders
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

### Edge Functions

- Move to dedicated servers if traffic > 100k requests/day
- Implement caching layer (Redis)
- Use connection pooling

### Mobile App

- Implement code splitting
- Add offline support
- Cache frequently accessed data
- Optimize images and assets

---

## Cost Estimation

### Supabase (Free tier → Pro)

- **Free:** 500MB database, 1GB file storage, 50k monthly active users
- **Pro ($25/mo):** 8GB database, 100GB file storage, 100k MAU
- **Expected:** ~$25-50/mo for 100-500 retailers

### WhatsApp Cloud API

- **Free tier:** 1,000 conversations/month
- **Paid:** $0.004-0.03 per conversation (varies by country)
- **Expected:** ~$10-30/mo for 1,000-5,000 conversations

### Expo/EAS

- **Free:** Development builds
- **Production ($29/mo):** Unlimited builds, updates
- **Expected:** $29/mo

### Total Monthly Cost

- **MVP/Beta:** ~$0-10 (free tiers)
- **Early Growth:** ~$50-100 (100-500 users)
- **Scale:** ~$200-500 (1000+ users)

---

## Next Steps After Deployment

1. **Beta Testing** (2-4 weeks)
   - Invite 10-20 retailers
   - Collect feedback
   - Fix bugs
   - Iterate on UX

2. **Marketing Launch**
   - Create landing page
   - Social media presence
   - Demo videos
   - Partner with fashion associations

3. **Feature Expansion**
   - Real payment integration (MTN/Orange)
   - Advanced analytics
   - Multi-language support (French/English)
   - Web dashboard for retailers

4. **Scaling**
   - Optimize performance
   - Add customer support
   - Expand to other regions in Cameroon
   - Consider other West African markets

---

**Document Version:** 1.0  
**Last Updated:** January 2024  
**Platform Status:** Ready for Deployment ✅
