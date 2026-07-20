# Fashion Retail Mobile App

React Native mobile application built with Expo for fashion retailers in Cameroon.

## Features

- ✅ **Authentication** - Login, Signup, Password Reset
- ✅ **Onboarding** - Multi-step wizard for new retailers
- ✅ **Profile Management** - Edit business information
- 🚧 **Product Catalog** - Coming in Task 4
- 🚧 **Order Management** - Coming in Task 9
- 🚧 **Analytics Dashboard** - Coming in Task 10

## Tech Stack

- **React Native** - Cross-platform mobile framework
- **Expo** - Development tooling and build system
- **Expo Router** - File-based navigation
- **Supabase** - Authentication and database
- **TypeScript** - Type safety

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator

### Installation

```bash
# From project root
cd apps/mobile

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Add your Supabase credentials to .env
```

### Environment Variables

Create `.env` file with:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Get these from:
- Local Supabase: Run `npm run supabase:status` from project root
- Cloud Supabase: https://app.supabase.com → Project Settings → API

### Development

```bash
# Start development server
npm start

# Or from project root
npm run dev

# Run on iOS Simulator
npm run ios

# Run on Android Emulator
npm run android

# Run in web browser (for testing)
npm run web
```

## Project Structure

```
apps/mobile/
├── app/                      # Expo Router app directory
│   ├── _layout.tsx          # Root layout with AuthProvider
│   ├── index.tsx            # Landing/routing screen
│   ├── (auth)/              # Authentication screens
│   │   ├── _layout.tsx
│   │   ├── login.tsx        # Login screen
│   │   ├── signup.tsx       # Signup screen
│   │   ├── forgot-password.tsx
│   │   └── onboarding.tsx   # Multi-step wizard
│   └── (tabs)/              # Main app screens
│       ├── _layout.tsx
│       ├── index.tsx        # Dashboard
│       └── profile.tsx      # Profile management
│
├── contexts/
│   └── AuthContext.tsx      # Authentication state management
│
├── lib/
│   └── supabase.ts          # Supabase client configuration
│
├── app.json                 # Expo configuration
├── package.json
└── tsconfig.json
```

## Screens

### Authentication Flow

**Login Screen** (`(auth)/login.tsx`)
- Email and password authentication
- Form validation with error messages
- Link to signup and password reset
- Neo-Brutalist design with design system components

**Signup Screen** (`(auth)/signup.tsx`)
- Business name, email, phone, WhatsApp number
- Password strength validation
- Phone number format validation (+237XXXXXXXXX)
- Auto-creates retailer record in database

**Forgot Password** (`(auth)/forgot-password.tsx`)
- Email-based password reset
- Sends reset link via Supabase Auth

**Onboarding** (`(auth)/onboarding.tsx`)
- 3-step wizard for new retailers
- Welcome → Business Details → Preferences
- Optional business address
- Currency and timezone selection
- Skippable

### Main App

**Dashboard** (`(tabs)/index.tsx`)
- Welcome card with business name
- Quick stats (placeholder)
- Recent activity (placeholder)

**Profile** (`(tabs)/profile.tsx`)
- View/edit business information
- Update phone and WhatsApp numbers
- View account settings
- Sign out

## Design System Integration

All screens use the Neo-Brutalist design system:

```tsx
import {
  Button,
  Card,
  Input,
  Badge,
  Typography,
  Heading1,
  colors,
  spacing,
} from '@fashion-retail/design-system';
```

**Color Scheme:**
- 60% Ivory backgrounds
- 30% Black borders and text
- 10% Safety Orange accents

**Components:**
- Strong black borders
- Rounded corners
- All-caps headers
- Minimal shadows

## Authentication

Uses Supabase Auth with Row Level Security:

```tsx
const { user, retailer, signIn, signUp, signOut } = useAuth();
```

**Auth Flow:**
1. User signs up → Supabase Auth creates user
2. Trigger automatically creates retailer record
3. User logs in → Auth context loads retailer profile
4. RLS ensures user only sees their own data

## Navigation

File-based routing with Expo Router:

- `/(auth)/*` - Authentication screens (no auth required)
- `/(tabs)/*` - Main app screens (auth required)
- `index.tsx` - Routes based on auth state

## Validation

Uses shared validation utilities:

```tsx
import {
  isValidEmail,
  isValidPassword,
  isValidPhoneNumber,
  normalizePhoneNumber,
} from '@fashion-retail/shared';
```

## Building for Production

### iOS

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios
```

### Android

```bash
# Build for Android
eas build --platform android
```

### Submit to Stores

```bash
# Submit to App Store
eas submit --platform ios

# Submit to Google Play
eas submit --platform android
```

## Testing

```bash
# Run tests (when implemented)
npm test

# Run linting
npm run lint
```

## Troubleshooting

### "Couldn't start project" error
- Clear Expo cache: `npx expo start --clear`
- Delete node_modules: `rm -rf node_modules && npm install`

### "Supabase URL is not defined" error
- Check `.env` file exists
- Ensure variables start with `EXPO_PUBLIC_`
- Restart Expo server

### Authentication errors
- Verify Supabase is running (local) or accessible (cloud)
- Check RLS policies in Supabase Studio
- Ensure `handle_new_user()` trigger exists

### Navigation not working
- Ensure all route files are in correct directories
- Check `_layout.tsx` files are present
- Clear Expo cache and restart

## Next Steps

After Task 3 (Authentication) is complete, next features:

- **Task 4**: Product Catalog Management
- **Task 5**: WhatsApp Integration
- **Task 6**: Customer Tracking
- **Task 9**: Order Management
- **Task 10**: Analytics Dashboard

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/routing/introduction/)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [React Native](https://reactnative.dev/)
