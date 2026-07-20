# WhatsApp Cloud API Setup Guide

Complete guide to setting up WhatsApp Business Cloud API for the Fashion Retail Platform.

## Prerequisites

- Facebook Business Account
- WhatsApp Business Account
- Meta Developer Account
- A phone number (not currently on WhatsApp)

## Step-by-Step Setup

### 1. Create Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click **"My Apps"** → **"Create App"**
3. Select **"Business"** as app type
4. Fill in details:
   - **App Name**: Fashion Retail Cameroon
   - **Contact Email**: your-email@example.com
   - **Business Account**: Select or create one
5. Click **"Create App"**

### 2. Add WhatsApp Product

1. In your app dashboard, find **"WhatsApp"**
2. Click **"Set Up"**
3. Select or create a **WhatsApp Business Account**
4. You'll be redirected to WhatsApp setup

### 3. Get Test Number (Quick Start)

Meta provides a test number for development:

1. In WhatsApp setup, go to **"Getting Started"**
2. You'll see a test number (e.g., `+1 555...`)
3. Note the **Phone Number ID** (used in API calls)
4. Add up to 5 test recipient numbers:
   - Click **"Add phone number"**
   - Enter your personal WhatsApp number
   - Verify via SMS code
   - Repeat for team members

**Limitations of Test Number:**
- Can only message 5 pre-approved numbers
- Limited to 250 messages per day
- For testing only, not production

### 4. Get Access Token

**Temporary Token (for testing):**
1. In WhatsApp setup, go to **"Getting Started"**
2. Copy the **"Temporary Access Token"**
3. Valid for 24 hours
4. Use for initial testing

**Permanent Token (required):**
1. In app dashboard, go to **"Settings"** → **"Basic"**
2. Note your **"App ID"** and **"App Secret"**
3. Generate System User token:
   - Go to **Business Settings** → **"System Users"**
   - Click **"Add"** → Create system user
   - Click **"Generate New Token"**
   - Select your app
   - Select permissions: `whatsapp_business_messaging`, `whatsapp_business_management`
   - Copy the token (this is permanent!)

### 5. Set Up Production Phone Number

When ready for production:

1. In WhatsApp setup, click **"Add Phone Number"**
2. Choose option:
   - **Migrate existing number** (requires downtime)
   - **Register new number** (recommended)
3. Follow verification steps:
   - Enter phone number (+237XXXXXXXXX)
   - Receive SMS code
   - Verify number
4. Configure Display Name and Profile
5. Complete Business Verification (required for production)

### 6. Configure Webhook

1. In WhatsApp setup, go to **"Configuration"**
2. Click **"Edit"** under Webhook
3. Enter webhook details:
   - **Callback URL**: `https://your-project.supabase.co/functions/v1/whatsapp-webhook`
   - **Verify Token**: Create a random string (e.g., `your-secure-verify-token-123`)
4. Click **"Verify and Save"**
5. Subscribe to webhook fields:
   - ✅ `messages` (incoming messages)
   - ✅ `message_status` (delivery status)

### 7. Configure Environment Variables

Update your `.env` file:

```env
# WhatsApp Cloud API
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-account-id
WHATSAPP_ACCESS_TOKEN=your-permanent-access-token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-verify-token-123
WHATSAPP_WEBHOOK_SECRET=your-webhook-secret

# Supabase (for edge functions)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 8. Deploy Edge Functions

```bash
# Deploy webhook function
supabase functions deploy whatsapp-webhook \
  --no-verify-jwt

# Deploy send message function
supabase functions deploy send-whatsapp-message

# Set environment variables (secrets)
supabase secrets set \
  WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id \
  WHATSAPP_ACCESS_TOKEN=your-token \
  WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-verify-token \
  WHATSAPP_WEBHOOK_SECRET=your-secret
```

### 9. Test the Integration

**Send Test Message (via curl):**

```bash
curl -X POST \
  "https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "237XXXXXXXXX",
    "type": "text",
    "text": {
      "body": "Hello from Fashion Retail! 👋"
    }
  }'
```

**Test Webhook (send message to your business number):**

1. Send a WhatsApp message to your business number from a test recipient
2. Check Supabase logs: `supabase functions logs whatsapp-webhook`
3. Verify message appears in `messages` table
4. Verify customer auto-created in `customers` table

## Message Templates

For production, you need approved message templates for:
- Initial outreach (first 24 hours)
- Follow-ups after 24 hours
- Marketing messages

**Create Templates:**
1. Go to WhatsApp Manager → **"Message Templates"**
2. Click **"Create Template"**
3. Fill in:
   - **Name**: `greeting` (lowercase, no spaces)
   - **Category**: Utility, Marketing, or Authentication
   - **Languages**: English, French
   - **Message**: 
     ```
     Hello {{1}}! Welcome to {{2}}. 
     Browse our latest fashion: {{3}}
     ```
4. Submit for approval (takes 1-2 days)

## Rate Limits

### Test Number
- 250 messages per day
- 5 recipients only

### Production Number
- **Tier 1** (default): 1,000 messages per day
- **Tier 2**: 10,000 messages per day (after 7 days)
- **Tier 3**: 100,000 messages per day (after phone number verification)
- **Unlimited**: Request after sustained usage

## Pricing

**Free Tier:**
- First 1,000 conversations/month: **FREE**
- Includes both business-initiated and user-initiated

**After Free Tier:**
- **User-initiated**: ~$0.005 - $0.02 per conversation
- **Business-initiated**: ~$0.01 - $0.05 per conversation
- Prices vary by country

**Cameroon Pricing (approximate):**
- User-initiated: $0.01 per conversation
- Business-initiated: $0.03 per conversation
- Conversation = 24-hour window

## Best Practices

### 1. Message Quality
- Keep messages concise and relevant
- Use proper formatting
- Include clear call-to-actions
- Don't spam customers

### 2. Opt-In Required
- Get explicit consent before messaging
- Provide opt-out mechanism
- Respect customer preferences

### 3. 24-Hour Window
- Respond within 24 hours for free conversation
- Use templates for messages outside 24h window
- Plan conversation flow accordingly

### 4. Handle Errors
- Implement retry logic for failed messages
- Log all errors
- Monitor delivery status
- Handle rate limits gracefully

### 5. Customer Experience
- Personalize messages with customer name
- Use interactive buttons when appropriate
- Provide quick replies
- Maintain conversation context

## Troubleshooting

### "Invalid access token"
- Token expired (temporary tokens expire in 24h)
- Generate permanent token using system user
- Verify token has correct permissions

### "Phone number not registered"
- Recipient not on WhatsApp
- Recipient hasn't accepted chat
- Add recipient to test numbers (if using test number)

### "Webhook verification failed"
- Verify token doesn't match
- Check callback URL is accessible
- Ensure HTTPS (required)
- Check Supabase function logs

### "Message not delivered"
- Recipient blocked your number
- Recipient phone is off
- Check message status webhook
- Verify phone number format (+237XXXXXXXXX)

### "Rate limit exceeded"
- Upgrade to production number
- Request higher tier
- Implement message queuing
- Space out message sending

## Security

### Protect Credentials
- Never commit access tokens to git
- Use environment variables
- Rotate tokens regularly
- Use system user tokens (not temporary)

### Verify Webhooks
- Always verify webhook signatures
- Use HTTPS only
- Validate request origin
- Log suspicious activity

### Customer Privacy
- Store only necessary data
- Encrypt sensitive information
- Comply with GDPR/local regulations
- Provide data deletion mechanism

## Going to Production Checklist

- [ ] Register production phone number
- [ ] Complete business verification
- [ ] Create and approve message templates
- [ ] Set up permanent access token
- [ ] Configure webhook with production URL
- [ ] Test end-to-end flow
- [ ] Set up monitoring and alerts
- [ ] Train staff on WhatsApp guidelines
- [ ] Prepare opt-in mechanism
- [ ] Document customer support process

## Resources

- [WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Message Templates Guide](https://developers.facebook.com/docs/whatsapp/message-templates)
- [WhatsApp Business Policy](https://www.whatsapp.com/legal/business-policy)
- [API Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/reference)

## Support

- Meta Developer Support: https://developers.facebook.com/support
- WhatsApp Business Help: https://www.facebook.com/business/help/whatsapp
- Community Forum: https://developers.facebook.com/community

---

**Next Steps:**
- Task 6: Customer Profile Auto-Creation (integrate with webhook)
- Task 7: WhatsApp Product Browsing (build interactive flows)
- Task 8: AI Recommendations (add conversational intelligence)
