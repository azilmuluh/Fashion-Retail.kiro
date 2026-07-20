# Fashion Retail Platform - Setup Guide

## 🎯 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run setup script
npm run setup

# 3. Start local Supabase (optional - or use cloud)
npm run supabase:start

# 4. View design system demo
npm run demo
```

## 📁 Project Structure

```
fashion-retail-cameroon/
├── apps/                           # Applications
│   ├── mobile/                    # ✅ React Native + Expo app
│   │   ├── app/                  # Expo Router screens
│   │   │   ├── (auth)/          # Auth screens
│   │   │   └── (tabs)/          # Main app screens
│   │   ├── contexts/            # Auth context
│   │   └── lib/                 # Supabase client
│   ├── web/                       # Next.js dashboard (coming)
│   └── api/                       # Supabase Edge Functions (coming)
│
├── packages/                       # Shared packages
│   ├── design-system/             # ✅ Neo-Brutalist UI components
│   │   ├── src/
│   │   │   ├── tokens/           # Colors, typography, spacing
│   │   │   ├── components/       # Button, Card, Input, Badge, etc.
│   │   │   └── showcase/         # Component demos
│   │   ├── demo.html             # Visual demo (open in browser)
│   │   └── README.md
│   │
│   └── shared/                    # ✅ Shared types and utilities
│       ├── src/
│       │   ├── types/            # TypeScript types from database
│       │   ├── constants/        # App constants
│       │   ├── utils/            # Formatters, validators
│       │   └── lib/              # Supabase client
│       └── package.json
│
├── supabase/                       # ✅ Database configuration
│   ├── migrations/                # SQL migration files
│   │   └── 20240101000000_initial_schema.sql
│   ├── config.toml               # Supabase config
│   └── README.md                 # Setup instructions
│
├── scripts/                        # ✅ Utility scripts
│   └── setup.sh                  # Project setup script
│
├── .env.example                    # ✅ Environment template
├── .gitignore                      # ✅ Git ignore rules
├── package.json                    # ✅ Root package.json
├── turbo.json                      # ✅ Turborepo config
└── README.md                       # ✅ Project documentation
```

## ✅ What's Complete (Tasks 1-3)

### Task 1: Design System ✅
- 60/30/10 color scheme (Ivory/Black/Safety Orange)
- Typography tokens (Orbitron + Inter fonts)
- Complete component library
- Visual HTML demo

### Task 2: Project Setup & Supabase ✅
- Monorepo structure with Turborepo
- Database schema with 9 tables
- Row Level Security (RLS) policies
- TypeScript types generated from schema
- Shared utilities and constants
- Supabase client configuration
- Environment setup
- Setup scripts

### Task 3: Authentication & Onboarding ✅
- Login screen with validation
- Signup screen with business info
- Password reset flow
- Multi-step onboarding wizard
- Profile management screen
- Auth context with Supabase
- Protected routes
- Neo-Brutalist UI throughout

## 🗄️ Database Tables

| Table | Description |
|-------|-------------|
| `retailers` | Business profiles for fashion retailers |
| `products` | Product catalog with inventory tracking |
| `customers` | Auto-created profiles (identified by phone) |
| `orders` | Order management with status tracking |
| `order_items` | Line items for each order |
| `messages` | WhatsApp conversation history |
| `loyalty_programs` | Configurable loyalty program rules |
| `loyalty_points` | Customer points balance |
| `loyalty_transactions` | Points transaction history |

## 🔐 Row Level Security

All tables use RLS to ensure:
- Multi-tenant isolation (each retailer only sees their data)
- JWT-based authentication via Supabase Auth
- Automatic retailer record creation on signup

## 🎨 Design System

The Neo-Brutalist design system includes:

**Colors (60/30/10 Rule):**
- 60% Ivory `#F5EFE0` - Backgrounds
- 30% Black `#000000` - Text, borders
- 10% Safety Orange `#FF6B35` - Accents

**Components:**
- Button (4 variants: primary, secondary, outline, ghost)
- Card (3 variants: default, elevated, brutal)
- Input (with focus states and validation)
- Badge (6 variants for status indicators)
- Typography (display, body, label, caption, code)
- CodeBlock (dark theme #161616)
- GradientButton (orange gradient CTA)

**View the demo:**
```bash
npm run demo
# or
open packages/design-system/demo.html
```

## 🚀 Development Commands

### Mobile App
```bash
cd apps/mobile
npm start                # Start Expo dev server
npm run ios             # Run on iOS Simulator
npm run android         # Run on Android Emulator
```

### Package Management
```bash
npm install              # Install all dependencies
npm run clean           # Clean all build artifacts
```

### Supabase (Local Development)
```bash
npm run supabase:start   # Start local Supabase
npm run supabase:stop    # Stop local Supabase
npm run supabase:status  # View status and URLs
npm run supabase:push    # Apply migrations
npm run supabase:reset   # Reset database (⚠️ deletes data)
npm run supabase:types   # Generate TypeScript types
```

### Build & Development
```bash
npm run dev             # Run all apps in dev mode
npm run build           # Build all apps
npm run lint            # Lint all code
```

## 🔧 Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Required variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Public anon key (safe for client)
- `SUPABASE_SERVICE_ROLE_KEY` - Admin key (server-side only!)

Get these from:
1. Local: Run `npm run supabase:status`
2. Cloud: https://app.supabase.com → Project Settings → API

## 📖 Documentation

- **`README.md`** - Project overview and architecture
- **`supabase/README.md`** - Database setup and schema details
- **`packages/design-system/README.md`** - Design system guide
- **`SETUP.md`** (this file) - Complete setup instructions

## 🧪 Testing the Setup

### 1. Verify Supabase Connection

Start local Supabase:
```bash
npm run supabase:start
```

You should see:
- API URL: `http://localhost:54321`
- DB URL: `postgresql://postgres:postgres@localhost:54322/postgres`
- Studio URL: `http://localhost:54323`

### 2. View Database in Studio

Open http://localhost:54323

Navigate to:
- **Table Editor** - See all 9 tables
- **SQL Editor** - Run test queries
- **Authentication** - Manage users

### 3. Test RLS Policies

In SQL Editor:
```sql
-- This should work (reading your own data)
SELECT * FROM retailers WHERE email = auth.jwt() ->> 'email';

-- This should return empty (RLS protecting other retailers)
SELECT * FROM retailers WHERE email != auth.jwt() ->> 'email';
```

### 4. View Design System

```bash
npm run demo
```

Should open the HTML demo showing:
- All color tokens
- Typography styles
- Component variants
- Layout examples

## 🎯 Next Steps

**Task 3: Retailer Authentication & Onboarding**
- Build auth screens with Neo-Brutalist design
- Create onboarding flow
- Implement profile management

**Task 4: Product Catalog Management**
- Product CRUD with grid layout
- Image upload functionality
- Real-time updates

**Task 5: WhatsApp Cloud API Integration**
- Set up WhatsApp Cloud API
- Create webhook endpoint
- Implement message handling

## 🐛 Troubleshooting

### "Module not found" errors
```bash
npm install
```

### Supabase won't start
- Ensure Docker is running
- Try: `npm run supabase:stop && npm run supabase:start`

### RLS errors when querying
- Ensure you're authenticated
- Check policies in Supabase Studio
- Use service role key for admin operations (server-side only)

### TypeScript errors in shared package
```bash
cd packages/shared
npm run build
```

## 📞 Support

- **Project Issues**: Create a GitHub issue
- **Supabase Help**: https://supabase.com/docs
- **Design System**: See `packages/design-system/README.md`

---

**Status**: Tasks 1-3 Complete ✅ | Next: Task 4 (Product Catalog Management)
