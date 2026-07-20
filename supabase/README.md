# Supabase Setup Guide

This directory contains the database schema, migrations, and configuration for the Fashion Retail Platform.

## Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Supabase CLI**: Install via npm:
   ```bash
   npm install -g supabase
   ```

## Local Development Setup

### 1. Initialize Supabase Locally

```bash
# From project root
cd supabase
supabase init
```

### 2. Start Local Supabase

```bash
supabase start
```

This will start:
- PostgreSQL database on `localhost:54322`
- API server on `localhost:54321`
- Studio (UI) on `localhost:54323`

### 3. Apply Migrations

```bash
supabase db push
```

### 4. Access Supabase Studio

Open http://localhost:54323 to access the Supabase Studio UI where you can:
- View tables and data
- Test SQL queries
- Manage authentication
- Configure storage

## Production Setup

### 1. Create Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Choose a name, password, and region (closest to Cameroon: Europe West)
4. Wait for project to be created

### 2. Link Local Project to Remote

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref
```

Find your project ref in the Supabase dashboard URL: `https://app.supabase.com/project/[project-ref]`

### 3. Push Migrations to Production

```bash
supabase db push --linked
```

### 4. Get API Keys

From your Supabase project dashboard:
1. Go to Settings → API
2. Copy:
   - `Project URL`
   - `anon public` key
   - `service_role` key (keep secret!)

### 5. Update Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Database Schema

The database includes the following tables:

### Core Tables

- **`retailers`** - Business profiles for fashion retailers
- **`products`** - Product catalog with inventory tracking
- **`customers`** - Auto-created customer profiles (identified by phone)
- **`orders`** - Order management with status tracking
- **`order_items`** - Line items for each order

### Communication

- **`messages`** - WhatsApp conversation history

### Loyalty Program

- **`loyalty_programs`** - Configurable loyalty program rules
- **`loyalty_points`** - Customer points balance
- **`loyalty_transactions`** - Points transaction history

## Row Level Security (RLS)

All tables have RLS enabled with policies that:
- Isolate retailer data (multi-tenant architecture)
- Only allow retailers to access their own data
- Use JWT authentication from Supabase Auth

## Automatic Triggers

### User Signup
When a user signs up via Supabase Auth:
1. `handle_new_user()` automatically creates a retailer record
2. Links the auth user to the retailer via UUID

### Order Creation
When an order is created:
1. `update_customer_stats()` automatically updates customer statistics:
   - Increments `total_orders`
   - Adds to `total_spent`
   - Updates `last_order_date`

## Testing the Database

### Create a Test Retailer

```sql
-- In Supabase SQL Editor
INSERT INTO retailers (email, business_name, phone_number, whatsapp_number)
VALUES (
  'test@example.com',
  'Test Fashion Store',
  '+237670000000',
  '+237670000000'
)
RETURNING *;
```

### Create Test Products

```sql
INSERT INTO products (
  retailer_id,
  name,
  category,
  price,
  stock_quantity
)
VALUES 
  (
    (SELECT id FROM retailers WHERE email = 'test@example.com'),
    'Red Summer Dress',
    'dresses',
    25000,
    50
  ),
  (
    (SELECT id FROM retailers WHERE email = 'test@example.com'),
    'Black Leather Shoes',
    'shoes',
    35000,
    30
  )
RETURNING *;
```

## Common Commands

```bash
# Start local Supabase
supabase start

# Stop local Supabase
supabase stop

# View database status
supabase status

# Generate TypeScript types from schema
supabase gen types typescript --local > ../packages/shared/src/types/database.types.ts

# Create a new migration
supabase migration new your_migration_name

# Reset local database (WARNING: deletes all data)
supabase db reset

# View logs
supabase logs
```

## Migrations

Migrations are SQL files in `migrations/` that define database changes:

- `20240101000000_initial_schema.sql` - Initial database setup

To create a new migration:

```bash
supabase migration new add_new_feature
```

Edit the generated file in `migrations/`, then apply it:

```bash
supabase db push
```

## Backup and Restore

### Backup

```bash
# Backup production database
supabase db dump --linked > backup.sql
```

### Restore

```bash
# Restore to local
psql -h localhost -p 54322 -U postgres -d postgres < backup.sql
```

## Troubleshooting

### "relation does not exist" error
- Run `supabase db push` to apply migrations
- Check migration files for syntax errors

### RLS policies blocking queries
- Verify you're authenticated with the correct retailer account
- Check RLS policies in Supabase Studio
- Use service role key for admin operations (server-side only!)

### Connection refused
- Ensure Supabase is running: `supabase status`
- Check Docker is running
- Restart Supabase: `supabase stop && supabase start`

## Security Best Practices

1. **Never commit `.env` files** - Only commit `.env.example`
2. **Keep service role key secret** - Only use server-side
3. **Use anon key for client apps** - It's safe for public use
4. **Test RLS policies** - Ensure data isolation works
5. **Enable SSL in production** - Supabase enforces this by default

## Next Steps

After setup:
1. ✅ Verify all tables exist in Supabase Studio
2. ✅ Test RLS policies with test data
3. ✅ Configure authentication settings
4. ✅ Set up storage buckets for product images
5. ✅ Deploy Edge Functions for WhatsApp webhook

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- Project-specific issues: Create a GitHub issue
