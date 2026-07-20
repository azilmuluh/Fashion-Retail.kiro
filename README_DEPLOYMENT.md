# Fashion Retail Platform - Deployment Guide

## 🌿 HopeRise Design Implementation

A modern, empathetic fashion retail management platform with warm cream backgrounds, vibrant leaf-green accents, and pill-shaped UI components.

## 🎨 Design Highlights

- **Color Palette**: Soft cream (#F8F5EE), warm beige (#EAE3D2), vibrant green (#2ECC71)
- **UI Style**: Pill-shaped buttons, rounded cards (24px), generous whitespace
- **Icons**: Lucide React Native icons throughout
- **Typography**: Heavy headlines (800-900 weight), clean body text
- **Shadows**: Soft, subtle (0-8px with low opacity)

## 📦 Tech Stack

- **Framework**: React Native with Expo SDK 54
- **Web**: React Native Web for browser compatibility
- **Backend**: Supabase (PostgreSQL + Auth)
- **Styling**: React Native StyleSheet with design tokens
- **Icons**: Lucide React Native
- **Navigation**: Expo Router (file-based routing)

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Xcode (for iOS development)
- Watchman (for file watching)

### Installation

```bash
# Clone repository
git clone https://github.com/azilmuluh/Fashion-Retail.kiro.git
cd Fashion-Retail.kiro

# Install dependencies
npm install --legacy-peer-deps

# Navigate to mobile app
cd apps/mobile

# Start development server
npx expo start --web
```

### Access the App

- **Web**: http://localhost:8081
- **iOS Simulator**: Press `i` in terminal
- **Android**: Press `a` in terminal

## 📱 Features

### Demo Dashboard
- Sample business metrics
- Revenue overview with icons
- Inventory status tracking
- Category breakdown visualization
- Feature highlights
- Clear call-to-action for signup

### Authentication
- User signup with business details
- Email/password login
- Supabase authentication
- Profile management

### Dashboard
- Real-time analytics
- Revenue tracking
- Inventory management
- Order status monitoring
- Customer insights

### Future Features
- WhatsApp integration
- Product catalog
- Order management
- Customer loyalty program
- Analytics & reporting

## 🎨 Design System

### Colors
```typescript
colors.primary.green = '#2ECC71'      // CTAs and highlights
colors.primary.cream = '#F8F5EE'      // Main background
colors.primary.beige = '#EAE3D2'      // Secondary background
colors.text.primary = '#1C1C1C'       // Dark charcoal text
colors.text.secondary = '#4A4A4A'     // Gray text
```

### Components
- **Button**: Pill-shaped with soft shadows
- **Input**: Rounded (16px) with green focus state
- **Card**: 24px radius with subtle shadows
- **Badge**: Fully circular or pill-shaped

### Icons
All emojis replaced with Lucide icons:
- DollarSign: Revenue
- Package: Inventory
- ShoppingCart: Orders
- Users: Customers
- MessageCircle: WhatsApp
- BarChart3: Analytics
- Gift: Loyalty
- Bell: Notifications

## 🗂️ Project Structure

```
Fashion-Retail/
├── apps/
│   └── mobile/              # Mobile/Web app
│       ├── app/             # Expo Router screens
│       │   ├── (auth)/      # Auth screens (demo, login, signup)
│       │   ├── (tabs)/      # Main app tabs (dashboard, products, etc.)
│       │   └── index.tsx    # Root router
│       ├── assets/          # Images, fonts, logo
│       ├── contexts/        # React contexts (Auth)
│       ├── lib/             # Supabase client
│       └── web/             # Web-specific files (HTML, CSS, manifest)
├── packages/
│   ├── design-system/       # Shared UI components & tokens
│   └── shared/              # Shared utilities & types
└── docs/                    # Documentation
```

## 🌐 Web Optimization

### Features
- Custom HTML template with loading screen
- Web-specific CSS with HopeRise styling
- Custom scrollbar (green with soft edges)
- Hover effects and transitions
- PWA manifest for installability
- Responsive design (mobile, tablet, desktop)
- SEO meta tags

### Browser Support
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## 📝 Environment Variables

Create `.env` file in `apps/mobile/`:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_ROUTER_APP_ROOT=app
```

## 🔧 Development

### Run Development Server
```bash
cd apps/mobile
npx expo start --clear
```

### Build for Production
```bash
# Web
npx expo export:web

# iOS
npx expo build:ios

# Android
npx expo build:android
```

### Code Quality
```bash
# Type checking
npx tsc --noEmit

# Linting (if configured)
npm run lint
```

## 📊 Supabase Setup

### Required Tables
- `retailers`: Business accounts
- `products`: Inventory items
- `orders`: Customer orders
- `customers`: Customer database
- `messages`: WhatsApp message history

### Authentication
- Email/password authentication enabled
- Email confirmation required
- Row-level security (RLS) policies configured

## 🚢 Deployment

### Web (Vercel/Netlify)
1. Build web version: `npx expo export:web`
2. Deploy `web-build` folder to hosting
3. Set environment variables in hosting dashboard

### Mobile (App Stores)
1. Configure `app.json` with bundle identifiers
2. Build with EAS Build: `eas build --platform all`
3. Submit to App Store/Play Store

## 🐛 Troubleshooting

### Metro bundler issues
```bash
# Clear cache
npx expo start --clear

# Reset Metro
rm -rf .expo node_modules
npm install --legacy-peer-deps
```

### Web not loading
- Check if port 8081 is available
- Clear browser cache
- Check console for errors

### Icons not showing
```bash
# Reinstall Lucide icons
npm install lucide-react-native --legacy-peer-deps
```

## 📄 License

MIT License - See LICENSE file for details

## 👥 Contributors

- Azil Muluh (@azilmuluh)

## 🔗 Links

- **Repository**: https://github.com/azilmuluh/Fashion-Retail.kiro.git
- **Demo**: http://localhost:8081 (local)
- **Issues**: https://github.com/azilmuluh/Fashion-Retail.kiro/issues

## 📞 Support

For questions or issues:
- Open a GitHub issue
- Check existing documentation
- Review Expo documentation: https://docs.expo.dev

---

**Built with ❤️ using Expo, React Native, and Supabase**
