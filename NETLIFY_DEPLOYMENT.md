# Netlify Deployment Guide

Complete guide to deploy the Fashion Retail WhatsApp Business Platform to Netlify.

## Prerequisites

- GitHub account
- Netlify account (free tier works)
- Supabase project set up
- Node.js 18+ installed locally

## Step 1: Prepare Your Repository

### 1.1 Ensure all changes are committed

```bash
cd /Users/azilnwi/Documents/AWSredeploy/FASHION
git status
git add .
git commit -m "Add AI features and Netlify configuration"
git push origin main
```

### 1.2 Verify build works locally

```bash
cd apps/mobile
npm install
./build-web.sh
```

This should create a `dist` folder with your web build.

## Step 2: Deploy Edge Functions to Supabase

Before deploying the web app, deploy the Edge Functions:

```bash
cd /Users/azilnwi/Documents/AWSredeploy/FASHION

# Link to your Supabase project
supabase link --project-ref yymfeyslutfcucapyhtj

# Set environment variables
supabase secrets set OPENAI_API_KEY="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"
supabase secrets set WHATSAPP_PHONE_NUMBER_ID="1185208911349429"
supabase secrets set WHATSAPP_ACCESS_TOKEN="YOUR_WHATSAPP_TOKEN"

# Deploy all Edge Functions
supabase functions deploy ai-catalog-generator
supabase functions deploy ai-chat-assistant
supabase functions deploy whatsapp-webhook --no-verify-jwt
supabase functions deploy whatsapp-order-handler
supabase functions deploy inventory-analytics
supabase functions deploy engagement-automation
supabase functions deploy payment-reminders
supabase functions deploy whatsapp-analytics
```

## Step 3: Run Database Migrations

```bash
# Run migrations
supabase db push

# Verify tables were created
supabase db diff
```

## Step 4: Set Up Netlify

### 4.1 Create New Site on Netlify

1. Go to https://app.netlify.com
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub** and authorize Netlify
4. Select your repository: `FASHION`

### 4.2 Configure Build Settings

Netlify should auto-detect the `netlify.toml` file. Verify these settings:

- **Build command:** `cd apps/mobile && npm install && npx expo export:web`
- **Publish directory:** `apps/mobile/dist`
- **Node version:** 18

### 4.3 Set Environment Variables

In Netlify dashboard → **Site settings** → **Environment variables**, add:

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://yymfeyslutfcucapyhtj.supabase.co` | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Your Supabase anon key |
| `NODE_VERSION` | `18` | Node.js version |

**To get your Supabase credentials:**

```bash
supabase status
```

Look for:
- `API URL` → Use as `EXPO_PUBLIC_SUPABASE_URL`
- `anon key` → Use as `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### 4.4 Deploy

Click **"Deploy site"**

Netlify will:
1. Clone your repo
2. Install dependencies
3. Build the Expo web version
4. Deploy to CDN

⏱️ First deployment takes 3-5 minutes.

## Step 5: Configure Custom Domain (Optional)

### 5.1 Add Domain

1. Go to **Domain settings**
2. Click **"Add custom domain"**
3. Enter your domain (e.g., `fashion-retail-cameroon.com`)

### 5.2 Update DNS

Add these records to your domain registrar:

**For Apex Domain (fashion-retail-cameroon.com):**
```
A Record → 75.2.60.5
```

**For Subdomain (www.fashion-retail-cameroon.com):**
```
CNAME → YOUR-SITE-NAME.netlify.app
```

### 5.3 Enable HTTPS

Netlify automatically provisions SSL certificates. Wait 1-5 minutes for it to activate.

## Step 6: Verify Deployment

### 6.1 Check Site

Visit your Netlify URL: `https://YOUR-SITE-NAME.netlify.app`

You should see:
- ✅ Login screen
- ✅ Ability to create account
- ✅ Dashboard loads after login

### 6.2 Test AI Features

1. **AI Bulk Upload:**
   - Navigate to Products → AI Bulk Upload FAB
   - Upload 2-3 product images
   - Verify AI analyzes them
   - Check preview screen

2. **AI Chat Assistant:**
   - Click floating AI button on dashboard
   - Send a test message: "Analyze my sales"
   - Verify response includes business data

3. **WhatsApp Dashboard:**
   - Click WhatsApp tab
   - Verify analytics load (may be empty if no messages yet)

### 6.3 Check Edge Functions

```bash
# Test AI catalog generator
curl -X POST https://yymfeyslutfcucapyhtj.supabase.co/functions/v1/ai-catalog-generator \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"images":["https://example.com/test.jpg"]}'

# Test AI chat assistant
curl -X POST https://yymfeyslutfcucapyhtj.supabase.co/functions/v1/ai-chat-assistant \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","conversationHistory":[],"includeBusinessContext":false}'
```

## Troubleshooting

### Issue: "Blank page after deployment"

**Solution:**
1. Check Netlify build logs for errors
2. Verify environment variables are set correctly
3. Test build locally: `cd apps/mobile && npm run build:web`
4. Check browser console for errors (F12 → Console)

### Issue: "Cannot connect to Supabase"

**Solution:**
1. Verify `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set in Netlify
2. Check Supabase project is running: `supabase status`
3. Verify RLS policies allow anonymous access where needed

### Issue: "AI features not working"

**Solution:**
1. Verify Edge Functions are deployed: `supabase functions list`
2. Check OpenAI API key is valid
3. Check Supabase function logs: `supabase functions logs ai-catalog-generator`

### Issue: "Build fails with memory error"

**Solution:**
Add to `netlify.toml`:
```toml
[build.environment]
  NODE_OPTIONS = "--max_old_space_size=4096"
```

### Issue: "Routes not working (404 on refresh)"

**Solution:**
This is already handled by the redirect rule in `netlify.toml`. If still failing, verify the file exists in your repo.

## Continuous Deployment

Netlify automatically deploys when you push to GitHub:

```bash
git add .
git commit -m "Update features"
git push origin main
```

Netlify will:
1. Detect the push
2. Rebuild the site
3. Deploy automatically (2-3 minutes)

## Performance Optimization

### Enable Branch Previews

1. Go to **Site settings** → **Build & deploy** → **Deploy contexts**
2. Enable **Deploy Previews** for pull requests
3. Every PR gets a preview URL

### Enable Asset Optimization

Netlify automatically:
- ✅ Minifies JS/CSS
- ✅ Compresses images
- ✅ Enables Brotli compression
- ✅ Serves via global CDN

### Monitor Performance

1. Go to **Analytics** tab (if using Netlify Analytics)
2. Check:
   - Page load times
   - Bandwidth usage
   - Top pages

## Cost Estimation

**Netlify Free Tier Includes:**
- 100 GB bandwidth/month
- 300 build minutes/month
- Automatic SSL
- Global CDN

**Typical Usage:**
- 50-100 retailers = ~10-20 GB/month
- Well within free tier

**If you exceed free tier:**
- Pro plan: $19/month
- Includes 400 GB bandwidth
- Unlimited builds

## Support

### Netlify Support
- Docs: https://docs.netlify.com
- Community: https://answers.netlify.com

### Supabase Support
- Docs: https://supabase.com/docs
- Discord: https://discord.supabase.com

### Platform Issues
- Check Supabase logs: `supabase logs`
- Check Netlify build logs: Dashboard → Deploys → Latest
- Check browser console: F12 → Console

## Next Steps

1. ✅ Deploy successfully
2. 📱 Set up WhatsApp Business API webhook
3. 🧪 Test with real users
4. 📊 Monitor analytics
5. 🚀 Scale as needed

---

**Deployment Checklist:**

- [ ] Code pushed to GitHub
- [ ] Supabase Edge Functions deployed
- [ ] Database migrations run
- [ ] Netlify site created
- [ ] Environment variables set
- [ ] Site deployed successfully
- [ ] Login works
- [ ] AI features tested
- [ ] WhatsApp dashboard loads
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active

---

*Last updated: July 22, 2026*
