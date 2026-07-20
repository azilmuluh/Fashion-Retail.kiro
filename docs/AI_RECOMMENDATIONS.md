# AI-Powered Product Recommendations

## Overview

The AI Recommendation system provides intelligent product suggestions based on natural language customer queries. It uses a **hybrid approach**: OpenAI API for advanced recommendations when available, with an automatic fallback to a sophisticated rule-based system.

## Features

### 🤖 **Dual-Mode Operation**

**AI Mode (OpenAI GPT-3.5)**
- Natural language understanding
- Context-aware product matching
- Learns from product descriptions
- Provides personalized reasons for recommendations

**Rule-Based Mode (Fallback)**
- Works without API keys
- Intent extraction from queries
- Keyword matching and scoring
- Category, price, and color filtering

### 🎯 **Smart Intent Detection**

The system understands:
- **Categories**: "dress", "shoes", "bags", "jackets"
- **Colors**: "red", "blue", "black", "white", etc.
- **Price**: "cheap", "affordable", "luxury", "premium"
- **Occasions**: "wedding", "formal", "casual", "party"
- **Styles**: "summer", "winter", "light", "warm"

### 📊 **Customer Tracking**

Automatically tracks:
- Viewed products (last 50)
- Browsed categories (last 20)
- Search queries (last 30)
- Last interaction timestamp

### 💬 **Natural Conversations**

Customers can ask naturally:
- "I need a red dress for a wedding"
- "Show me affordable shoes"
- "Recommend something casual"
- "Looking for summer clothes"
- "I want stylish formal wear"

## How It Works

### 1. **Query Analysis**

When a customer sends a message containing recommendation keywords:
- "recommend", "suggest", "need", "want"
- "looking for", "show me", "i like"

The system triggers the recommendation engine.

### 2. **Product Matching**

**AI Mode:**
1. Fetches available products from database
2. Creates context for OpenAI with product details
3. Sends customer query to GPT-3.5
4. Receives structured recommendations with reasons
5. Returns top 3-5 products

**Rule-Based Mode:**
1. Extracts intent from query (category, colors, price)
2. Scores each product based on relevance
3. Ranks products by score
4. Returns top 5 matches

### 3. **Response Delivery**

The system sends:
1. Friendly intro message with AI/curated badge
2. Interactive list of recommended products
3. Each with name, price, and stock info
4. Tap to view full product details

### 4. **Interaction Tracking**

Every interaction is logged:
- Product views
- Category browsing
- Search queries
- Stored in customer metadata for future use

## Scoring Algorithm (Rule-Based)

Products are scored based on:

| Factor | Points | Description |
|--------|--------|-------------|
| Category match | +10 | Product category matches intent |
| Keyword match | +8 | Name/description contains query |
| Color match | +5 | Product has requested color |
| Price range | +3 | Within specified price range |
| High stock | +1 | More than 5 items available |

**Total possible score:** 27 points

Only products with score > 0 are recommended.

## Example Conversations

### Example 1: Formal Event
```
Customer: I need something formal for a wedding
AI/System: 🎯 Found 5 perfect items for you!
           🤖 AI-powered recommendations

           [View Products]
           • Evening Gown - 25,000 XAF - 3 available
           • Formal Shirt - 12,000 XAF - 10 available
           • Dress Shoes - 18,000 XAF - 5 available
           ...
```

### Example 2: Budget Shopping
```
Customer: Show me affordable shoes under 15000
AI/System: ✨ Here are 4 great options I think you'll love!
           💡 Curated just for you

           [View Products]
           • Casual Sneakers - 12,000 XAF - 8 available
           • Canvas Shoes - 10,000 XAF - 15 available
           • Sandals - 8,500 XAF - 12 available
           ...
```

### Example 3: Color Preference
```
Customer: Looking for a red dress
AI/System: 🌟 I've selected 3 items that match your style!
           🤖 AI-powered recommendations

           [View Products]
           • Red Summer Dress - 15,000 XAF - 5 available
           • Red Evening Dress - 22,000 XAF - 2 available
           • Red Cocktail Dress - 18,000 XAF - 4 available
```

### Example 4: No Matches
```
Customer: I want a green helicopter
AI/System: 🔍 Couldn't find exact matches for "green helicopter"
           
           Would you like to browse all products instead?
           [🛍️ Browse All] [❓ Help]
```

## Configuration

### OpenAI Setup (Optional)

1. **Get API Key**
   - Create account at https://platform.openai.com
   - Navigate to API Keys
   - Create new secret key

2. **Add to Environment**
   ```bash
   # .env
   OPENAI_API_KEY=sk-...your-key-here
   ```

3. **Deploy to Supabase**
   ```bash
   # Set environment variable in Supabase Edge Functions
   supabase secrets set OPENAI_API_KEY=sk-...your-key-here
   ```

### Without OpenAI

Simply omit the `OPENAI_API_KEY` and the system will automatically use the rule-based engine. It works perfectly fine without AI!

## AI Prompt Engineering

The system uses a carefully crafted prompt:

```
You are a helpful fashion retail assistant for a store in Cameroon.
Your job is to recommend products based on customer queries.

Rules:
1. Recommend 3-5 products maximum
2. Match the customer's request as closely as possible
3. Consider price, category, and style
4. Provide brief reasons for each recommendation
5. If no good matches, suggest similar alternatives
6. Keep responses concise and friendly
7. Return recommendations in JSON format
```

The response format:
```json
{
  "recommendations": [
    {
      "product_id": "uuid",
      "reason": "Perfect for summer events"
    }
  ],
  "message": "Here are some great options for you!"
}
```

## Performance & Costs

### OpenAI API Costs
- Model: GPT-3.5-Turbo
- ~500 tokens per request
- Cost: ~$0.001 per recommendation
- 1000 recommendations ≈ $1 USD

### Response Time
- AI Mode: 1-3 seconds
- Rule-Based: <100ms
- Fallback is instant if AI fails

### Rate Limits
- OpenAI: 3 requests/minute (free tier)
- 60 requests/minute (paid tier)
- Automatic fallback on rate limit

## Database Schema

### Customer Metadata (JSONB)
```json
{
  "interaction_history": {
    "viewed_products": ["uuid1", "uuid2", ...],
    "viewed_categories": ["dresses", "shoes", ...],
    "search_queries": ["red dress", "formal shoes", ...]
  },
  "last_interaction": "2024-01-15T10:30:00Z"
}
```

### Message Metadata (Recommendations)
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "is_recommendation": true
}
```

## Advanced Features (Future)

### Planned Enhancements
1. **Personalization**
   - Learn from purchase history
   - Adapt to customer preferences
   - Size and fit recommendations

2. **Collaborative Filtering**
   - "Customers who bought X also liked Y"
   - Trending products for similar customers

3. **Seasonal Recommendations**
   - Weather-based suggestions
   - Holiday and event-based

4. **Multi-language**
   - French language support
   - Local dialect understanding

5. **Image Recognition**
   - Send photo to find similar items
   - Style matching

## Best Practices

### For Retailers

1. **Product Descriptions**
   - Write detailed, descriptive names
   - Include style, occasion, and features
   - Mention colors, materials, seasons

2. **Categorization**
   - Use consistent category names
   - Tag products appropriately
   - Keep categories broad but meaningful

3. **Pricing Strategy**
   - Clear price ranges for different segments
   - Mark premium vs budget items
   - Use descriptive language

### For Developers

1. **Error Handling**
   - Always provide fallback to rule-based
   - Log AI failures for monitoring
   - Graceful degradation

2. **Performance**
   - Cache frequent queries
   - Limit product context (50 items)
   - Async processing

3. **Testing**
   - Test with and without OpenAI key
   - Verify both code paths work
   - Monitor recommendation quality

## Troubleshooting

### AI Not Working
**Problem**: Getting rule-based instead of AI recommendations

**Solutions**:
- Verify `OPENAI_API_KEY` is set correctly
- Check API key is valid at OpenAI dashboard
- Review Supabase Edge Function logs
- Ensure you have OpenAI credits

### Poor Recommendations
**Problem**: Suggested products don't match query

**Solutions**:
- Improve product descriptions
- Add more details to product data
- Verify categories are correct
- Check scoring algorithm weights

### Slow Response
**Problem**: Recommendations take too long

**Solutions**:
- Reduce product context size (currently 50)
- Use rule-based mode for faster responses
- Cache common queries
- Optimize database queries

### Rate Limit Errors
**Problem**: OpenAI rate limit exceeded

**Solutions**:
- Upgrade OpenAI plan
- Implement request queuing
- Use rule-based mode as primary
- Cache recommendations

## Monitoring

### Key Metrics

Track these in your analytics:
- Recommendation requests per day
- AI vs rule-based usage ratio
- Average response time
- Recommendation click-through rate
- Conversion rate from recommendations

### Logs to Monitor

```typescript
// Success
"AI recommendations generated: 5 products"
"Rule-based recommendations generated: 4 products"

// Errors
"OpenAI API error: rate limit exceeded"
"No products match intent"
"Failed to parse AI response"
```

## Integration with Other Tasks

### Connected Features
- **Task 7**: Catalog browsing provides data
- **Task 9**: Recommendations lead to orders
- **Task 11**: Loyalty points affect recommendations

### Data Flow
1. Customer sends query
2. AI analyzes intent
3. Products recommended
4. Customer views details
5. Customer places order
6. Interaction tracked
7. Future recommendations improve

## References

- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [GPT-3.5 Turbo Guide](https://platform.openai.com/docs/guides/gpt)
- [Prompt Engineering Best Practices](https://platform.openai.com/docs/guides/prompt-engineering)

---

**Next Steps**: After customers receive recommendations, they can proceed to **Task 9: Order Creation** to complete their purchase!
