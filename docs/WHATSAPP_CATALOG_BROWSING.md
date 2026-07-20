# WhatsApp Product Catalog Browsing

## Overview

The WhatsApp Catalog Browsing feature allows customers to explore and interact with your product catalog directly through WhatsApp conversations. This creates a seamless shopping experience without requiring customers to install an app or visit a website.

## Features

### 🛍️ **Conversational Shopping**
- Natural language interaction
- Context-aware responses
- Multi-language greetings (English, French)

### 📱 **Interactive Menus**
- **Button Messages**: Quick action buttons (up to 3)
- **List Messages**: Scrollable product/category lists
- **Image Messages**: Product photos with descriptions

### 🔍 **Product Discovery**
- Browse by category
- Search by keyword
- View detailed product information
- See product images

### 💬 **Smart Responses**
- Greeting detection (Hi, Hello, Bonjour)
- Help commands
- Context-aware suggestions

## Customer Journey

### 1. **Initial Contact**
When a customer messages for the first time:
- Customer is automatically created in database
- Welcome message sent with action buttons
- Options: Browse Catalog, Help

### 2. **Browse Categories**
Customer selects "Browse Catalog":
- System fetches active product categories
- Displays list with product counts per category
- Customer selects a category

### 3. **View Products**
After selecting a category:
- Shows up to 10 products
- Displays: Name, Price, Stock availability
- Customer selects a product for details

### 4. **Product Details**
When viewing a product:
- Product name and description
- Price in XAF (Central African Franc)
- Stock quantity
- Available sizes and colors
- Product image (if available)
- Action buttons: Order Now, Back

## Supported Commands

### **Greetings**
- `hi`, `hello`, `hey`
- `bonjour`, `salut` (French)

### **Browse**
- `catalog`, `catalogue`
- `browse`, `shop`
- `products`

### **Search**
- `search [item]` - e.g., "search red dress"
- `find [item]` - e.g., "find shoes"
- `looking for [item]`

### **Help**
- `help`, `aide`

## Message Flow Examples

### Example 1: First-Time Customer
```
Customer: Hi
Bot: 👋 Welcome to our fashion store!
     How can we help you today?
     
     [🛍️ Browse Catalog] [❓ Help]

Customer: [Clicks Browse Catalog]
Bot: 🏪 Browse Our Collections
     Select a category to explore:
     
     [View Categories]
     • Dresses - 15 items available
     • Shoes - 23 items available
     • Accessories - 8 items available

Customer: [Selects "Dresses"]
Bot: 🛍️ DRESSES
     Found 15 products:
     
     [View Products]
     • Summer Dress - 12,000 XAF - 5 in stock
     • Evening Gown - 25,000 XAF - 3 in stock
     • ...

Customer: [Selects "Summer Dress"]
Bot: [Sends product image]
     🏷️ SUMMER DRESS
     💰 Price: 12,000 XAF
     📦 Stock: 5 available
     📂 Category: Dresses
     
     📝 Description:
     Beautiful lightweight summer dress...
     
     ✨ Available Options:
     • Sizes: S, M, L, XL
     • Colors: Red, Blue, White
     
     What would you like to do?
     [🛒 Order Now] [⬅️ Back]
```

### Example 2: Search
```
Customer: search red shoes
Bot: 🔍 Search Results: "red shoes"
     Found 3 products:
     
     [View Products]
     • Red Pumps - 18,000 XAF - Shoes
     • Red Sneakers - 15,000 XAF - Shoes
     • Red Sandals - 12,000 XAF - Shoes
```

### Example 3: Help
```
Customer: help
Bot: 🤝 HOW TO SHOP
     
     📱 Browse: Say "catalog" to see all categories
     🔍 Search: Say "search [item]" to find products
     💬 Ask: Just tell us what you're looking for!
     
     Examples:
     • "Show me dresses"
     • "Search red shoes"
     • "I need a jacket"
     
     Reply "catalog" to start browsing!
```

## Technical Implementation

### **Architecture**
- **Webhook Handler**: Receives incoming WhatsApp messages
- **Catalog Handler**: Processes catalog requests
- **Message Builder**: Creates formatted WhatsApp messages
- **Database**: Stores messages and customer interactions

### **Key Components**

#### 1. Catalog Handler (`catalog-handler.ts`)
```typescript
- handleCatalogMessage(): Routes messages to appropriate handlers
- sendWelcomeMessage(): Initial greeting
- sendCategoryList(): Browse categories
- sendProductsByCategory(): List products
- sendProductDetails(): Product information
- searchProducts(): Keyword search
```

#### 2. Message Types
- **Text**: Simple text messages
- **Interactive Button**: Up to 3 action buttons
- **Interactive List**: Scrollable lists with sections
- **Image**: Product photos with captions

#### 3. Database Integration
- Fetches products from `products` table
- Filters by retailer, active status, and stock
- Stores all messages in `messages` table
- Real-time updates via Supabase subscriptions

### **Rate Limiting**
WhatsApp Cloud API limits:
- 1000 messages per day (free tier)
- 60 messages per minute
- Use throttling for high-volume scenarios

## Configuration

### **Environment Variables**
Required in `.env`:
```
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token
WHATSAPP_WEBHOOK_SECRET=your_webhook_secret
WHATSAPP_API_VERSION=v18.0
```

### **Webhook Endpoint**
```
POST https://your-project.supabase.co/functions/v1/whatsapp-webhook
```

## Database Schema

### **Messages Table**
Stores all WhatsApp conversations:
```sql
- id: UUID
- retailer_id: UUID (FK)
- customer_id: UUID (FK)
- direction: 'inbound' | 'outbound'
- message_type: 'text' | 'image' | 'interactive' | 'template'
- content: TEXT
- whatsapp_message_id: TEXT
- status: 'sent' | 'delivered' | 'read' | 'failed'
- metadata: JSONB
- created_at: TIMESTAMPTZ
```

### **Products Queried Fields**
```sql
- id, name, description
- price, category
- stock_quantity
- images (TEXT[])
- sizes (TEXT[])
- colors (TEXT[])
- is_active
- retailer_id
```

## Best Practices

### **For Retailers**

1. **Product Data Quality**
   - Use clear, descriptive product names
   - Add detailed descriptions
   - Include high-quality images
   - Keep stock quantities accurate

2. **Category Organization**
   - Use consistent category names
   - Don't create too many categories
   - Group related items together

3. **Response Time**
   - Webhook processes messages instantly
   - Manual order confirmations should be prompt
   - Update stock in real-time

### **For Developers**

1. **Error Handling**
   - Always send 200 response to webhook
   - Log errors but don't expose to customers
   - Graceful degradation for missing data

2. **Message Formatting**
   - Respect WhatsApp character limits
   - Use emojis sparingly for clarity
   - Keep buttons concise (max 20 chars)

3. **Performance**
   - Cache frequently accessed data
   - Optimize database queries
   - Use indexes on filtered columns

## Troubleshooting

### **Customer Not Receiving Messages**
- Verify WhatsApp number is registered
- Check access token validity
- Ensure phone number format is correct
- Review message delivery status in database

### **Products Not Showing**
- Verify `is_active = true`
- Check `stock_quantity > 0`
- Confirm retailer association
- Review category names for typos

### **Interactive Messages Not Working**
- Verify button/list format
- Check character limits
- Ensure unique IDs for all buttons/rows
- Test with WhatsApp test number first

## Next Steps

After browsing, customers can:
- **Order products** (Task 9)
- **Get AI recommendations** (Task 8)
- **Join loyalty programs** (Task 11)

## Support

For issues or questions:
1. Check Supabase Edge Function logs
2. Review message history in database
3. Test with WhatsApp test number
4. Consult [WhatsApp Cloud API docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
