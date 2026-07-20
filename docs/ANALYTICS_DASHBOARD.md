# Analytics Dashboard & Inventory Tracking

## Overview

The Analytics Dashboard provides real-time business insights and inventory tracking for fashion retailers. It aggregates data from products, orders, and customers to present actionable metrics in a Neo-Brutalist design.

## Features

### 📊 **Key Metrics**

#### Revenue Overview
- **Total Revenue**: Sum of all order totals
- **Total Orders**: Count of all orders placed
- **Average Order Value**: Revenue divided by order count
- Real-time updates on new orders

#### Inventory Status
- **Total Products**: Active product count
- **Low Stock Products**: Items at or below threshold
- **Out of Stock Products**: Items with zero inventory
- **Total Stock Value**: Sum of (price × quantity) for all products

#### Order Management
- **Pending Orders**: Orders awaiting fulfillment
- **Completed Orders**: Fulfilled/delivered orders
- Order status breakdown

#### Customer Metrics
- **Total Customers**: All registered customers
- **New This Month**: Customers added in last 30 days
- Growth tracking

### 📂 **Category Analytics**

Visual breakdown of products by category:
- Product count per category
- Percentage distribution
- Visual progress bars
- Sorted by volume (highest first)

### 🎨 **Visual Design**

**Neo-Brutalist Elements:**
- Bold metric cards with black borders
- Orange accent for primary metrics
- Warning colors for low stock (amber)
- Danger colors for out of stock (red)
- Category bars with fill indicators
- Hard shadows for depth

**Color Coding:**
- **Primary Metric** (Orange background): Total Revenue
- **Warning** (Amber background): Low Stock
- **Danger** (Red background): Out of Stock
- **Standard** (White background): Normal metrics

## Dashboard Sections

### 1. Welcome Card
```
WELCOME BACK!
[Business Name]
[DASHBOARD]
```
- Orange background banner
- Business name display
- Quick visual identity

### 2. Revenue Overview
```
💰 REVENUE OVERVIEW
┌─────────────────────────────┐
│ 2,500,000 XAF              │  (Primary - Full width)
│ TOTAL REVENUE               │
└─────────────────────────────┘
┌──────────────┐ ┌──────────────┐
│ 85           │ │ 29,412 XAF   │
│ TOTAL ORDERS │ │ AVG ORDER    │
└──────────────┘ └──────────────┘
```

### 3. Inventory Status
```
📦 INVENTORY STATUS
┌──────────────┐ ┌──────────────┐
│ 150          │ │ 12 ⚠️        │
│ TOTAL        │ │ LOW STOCK    │
└──────────────┘ └──────────────┘
┌──────────────┐ ┌──────────────┐
│ 5 🚫         │ │              │
│ OUT OF STOCK │ │              │
└──────────────┘ └──────────────┘
┌─────────────────────────────┐
│ 4,850,000 XAF              │
│ TOTAL STOCK VALUE           │
└─────────────────────────────┘
```

### 4. Category Breakdown
```
📂 PRODUCTS BY CATEGORY
┌────────────────────────────┐
│ DRESSES          45 items  │
│ ██████████████░░░░░░ 30%   │
└────────────────────────────┘
┌────────────────────────────┐
│ SHOES            38 items  │
│ ████████████░░░░░░░░ 25%   │
└────────────────────────────┘
```

### 5. Orders Status
```
📋 ORDERS STATUS
┌──────────────┐ ┌──────────────┐
│ 12           │ │ 73           │
│ PENDING      │ │ COMPLETED    │
└──────────────┘ └──────────────┘
```

### 6. Customers
```
👥 CUSTOMERS
┌──────────────┐ ┌──────────────┐
│ 245          │ │ 28           │
│ TOTAL        │ │ NEW (30d)    │
└──────────────┘ └──────────────┘
```

## Calculations

### Inventory Metrics

**Total Products**
```typescript
products.length
```

**Low Stock Products**
```typescript
products.filter(p => 
  p.stock_quantity > 0 && 
  p.stock_quantity <= p.low_stock_threshold
).length
```

**Out of Stock Products**
```typescript
products.filter(p => p.stock_quantity === 0).length
```

**Total Stock Value**
```typescript
products.reduce((sum, p) => 
  sum + (p.price * p.stock_quantity), 0
)
```

### Sales Metrics

**Total Revenue**
```typescript
orders.reduce((sum, o) => sum + o.total_amount, 0)
```

**Average Order Value**
```typescript
totalRevenue / orders.length
```

**Pending Orders**
```typescript
orders.filter(o => 
  ['pending', 'confirmed', 'processing'].includes(o.status)
).length
```

### Customer Metrics

**New Customers This Month**
```typescript
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

customers.filter(c => 
  new Date(c.created_at) >= thirtyDaysAgo
).length
```

### Category Distribution

**Category Breakdown**
```typescript
const categoryBreakdown = {};
products.forEach(p => {
  categoryBreakdown[p.category] = 
    (categoryBreakdown[p.category] || 0) + 1;
});

// Sort by count descending
Object.entries(categoryBreakdown)
  .sort(([, a], [, b]) => b - a);
```

**Category Percentage**
```typescript
(categoryCount / totalProducts) * 100
```

## Real-Time Updates

### Pull-to-Refresh
The dashboard supports manual refresh:
1. User pulls down on screen
2. All metrics recalculated
3. Visual feedback during refresh
4. Data updates displayed

### Auto-Refresh (Future Enhancement)
- Websocket connections for live updates
- Push notifications for critical events
- Background data syncing

## Low Stock Alerts

### Visual Indicators

**Low Stock Warning** (Amber background)
- Triggered when stock ≤ threshold
- Visual color change
- ⚠️ emoji indicator
- Actionable metric

**Out of Stock Alert** (Red background)
- Triggered when stock = 0
- Critical visual change
- 🚫 emoji indicator
- Urgent action required

### Alert Thresholds

Configurable per product:
```typescript
low_stock_threshold: number  // Default: 10
```

When `stock_quantity <= low_stock_threshold`:
- Product appears in Low Stock count
- Visual warning on dashboard

When `stock_quantity === 0`:
- Product appears in Out of Stock count
- Critical alert on dashboard
- Hidden from customer catalog

## Data Freshness

### Fetch Strategy
1. **On Load**: Initial data fetch
2. **On Refresh**: Manual pull-to-refresh
3. **On Focus**: When returning to dashboard
4. **Real-time** (Future): Supabase subscriptions

### Cache Strategy
- No caching (always fresh data)
- Direct database queries
- Minimal latency

## Performance Optimization

### Query Efficiency

**Current Approach:**
```typescript
// Fetch all data
const products = await supabase.from('products').select('*');
const orders = await supabase.from('orders').select('*');
const customers = await supabase.from('customers').select('*');

// Calculate in-app
```

**Optimized Approach (Future):**
```typescript
// Server-side aggregation
const metrics = await supabase.rpc('get_dashboard_metrics');
```

### Aggregation Functions

Create database functions for metrics:

```sql
CREATE OR REPLACE FUNCTION get_dashboard_metrics(retailer_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_products', COUNT(DISTINCT p.id),
    'low_stock_count', COUNT(DISTINCT p.id) FILTER (
      WHERE p.stock_quantity > 0 
      AND p.stock_quantity <= p.low_stock_threshold
    ),
    'total_revenue', COALESCE(SUM(o.total_amount), 0),
    'total_orders', COUNT(DISTINCT o.id)
  )
  INTO result
  FROM products p
  LEFT JOIN orders o ON p.retailer_id = o.retailer_id
  WHERE p.retailer_id = retailer_uuid;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

## Mobile Responsiveness

### Layout Adaption
- 2-column grid for metrics
- Full-width for primary metrics
- Responsive card sizing
- Scroll optimization

### Screen Sizes
- **Small** (<375px): Single column fallback
- **Medium** (375-768px): 2-column grid
- **Large** (>768px): 3-column grid (future tablet support)

## Accessibility

### Visual Accessibility
- High contrast colors (black borders)
- Large, bold typography
- Clear visual hierarchy
- Emoji indicators for quick scanning

### Text Accessibility
- All metrics have labels
- Numbers formatted with separators
- Currency clearly indicated
- Status text descriptive

## Use Cases

### Daily Operations

**Morning Check:**
1. View pending orders
2. Check low stock items
3. Review yesterday's revenue
4. Plan restocking

**Throughout Day:**
1. Monitor new orders
2. Track stock levels
3. Check customer growth
4. Analyze category performance

### Business Planning

**Weekly Review:**
- Total revenue trends
- Best-selling categories
- Customer acquisition
- Inventory turnover

**Monthly Analysis:**
- Revenue growth
- Product performance
- Customer retention
- Stock optimization

### Inventory Management

**Restocking Decisions:**
1. Identify low stock items
2. Review category distribution
3. Calculate reorder quantities
4. Plan purchase orders

**Stock Optimization:**
1. Identify slow-moving inventory
2. Review stock value
3. Plan promotions
4. Optimize storage

## Future Enhancements

### Advanced Analytics

1. **Time-Series Charts**
   - Revenue over time (line chart)
   - Orders per day (bar chart)
   - Stock levels trend
   - Customer growth curve

2. **Comparative Analytics**
   - Month-over-month growth
   - Year-over-year comparison
   - Category performance ranking
   - Product velocity

3. **Predictive Analytics**
   - Stock-out predictions
   - Demand forecasting
   - Seasonal trends
   - Reorder suggestions

4. **Customer Analytics**
   - Purchase frequency
   - Customer lifetime value
   - Churn prediction
   - Segmentation

### Export & Reporting

1. **PDF Reports**
   - Daily sales summary
   - Weekly inventory report
   - Monthly business overview
   - Custom date ranges

2. **CSV Exports**
   - Sales data
   - Inventory snapshot
   - Customer list
   - Order history

3. **Email Notifications**
   - Daily digest
   - Low stock alerts
   - Revenue milestones
   - Custom triggers

### Integration

1. **Accounting Systems**
   - QuickBooks sync
   - Xero integration
   - Manual export

2. **Inventory Management**
   - Barcode scanning
   - Batch updates
   - Stock transfers

3. **External Reporting**
   - Google Analytics
   - Facebook Pixel
   - Custom webhooks

## Best Practices

### For Retailers

1. **Check Daily**
   - Morning dashboard review
   - Pending order count
   - Stock alerts

2. **Act on Alerts**
   - Restock low items immediately
   - Address out-of-stock quickly
   - Confirm pending orders

3. **Review Trends**
   - Weekly category performance
   - Monthly revenue analysis
   - Customer growth tracking

4. **Optimize Inventory**
   - Maintain buffer stock
   - Rotate slow-moving items
   - Track seasonal patterns

### For Developers

1. **Performance**
   - Cache expensive queries
   - Paginate large datasets
   - Use database aggregations

2. **Accuracy**
   - Validate calculations
   - Handle edge cases
   - Test with real data

3. **Scalability**
   - Plan for growth
   - Optimize queries early
   - Monitor performance

## Troubleshooting

### Metrics Not Updating

**Problem**: Dashboard shows old data

**Solutions**:
- Pull down to refresh manually
- Check internet connection
- Verify database permissions
- Review RLS policies

### Incorrect Calculations

**Problem**: Numbers don't match expectations

**Solutions**:
- Check date filters
- Verify order status filters
- Review cancelled orders handling
- Validate stock calculations

### Performance Issues

**Problem**: Dashboard loads slowly

**Solutions**:
- Reduce data fetched
- Implement server-side aggregation
- Add loading states
- Optimize queries

## Related Documentation

- [Product Catalog Management](./WHATSAPP_CATALOG_BROWSING.md)
- [Order Management](../apps/mobile/app/(tabs)/orders/)
- [Customer Tracking](../apps/mobile/app/(tabs)/customers/)
- [Database Schema](../supabase/migrations/)

---

**The Analytics Dashboard gives retailers complete visibility into their business performance and inventory health at a glance!** 📊✨
