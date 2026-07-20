# Fashion Retail Platform - Design System

A Neo-Brutalist, retro-futuristic design system for the Fashion Retail Platform.

## Design Philosophy

### Neo-Brutalist Aesthetic
- Strong black borders (`border: 1px solid #000`)
- Rounded corners for softness
- Minimal shadows (emphasis on structure)
- Bold, confident layouts with CSS Grid

### Color System (60/30/10 Rule)
- **60% Ivory** (`#F5EFE0`) - Backgrounds, large areas
- **30% Black** (`#000000`) - Text, borders, structural elements  
- **10% Safety Orange** (`#FF6B35`) - Accents, CTAs, highlights

### Typography
- **Display Font**: Ultra-wide extended techno (Orbitron, Space Grotesk)
  - All-caps headers
  - Extra-wide letter spacing
  - Bold, commanding presence
  
- **Body Font**: Geometric sans-serif (Inter, DM Sans)
  - Clean, readable
  - Modern, professional

## Installation

```bash
# From workspace root
npm install

# Or with yarn
yarn install
```

## Usage

### Import Tokens

```typescript
import { colors, spacing, typography, theme } from '@fashion-retail/design-system';

// Use individual tokens
const myStyle = {
  backgroundColor: colors.ivory,
  padding: spacing[4],
  fontFamily: typography.fontFamilies.display,
};

// Or use the complete theme
const anotherStyle = {
  backgroundColor: theme.colors.background.primary,
  ...theme.typography.presets.displayLarge,
};
```

### Use Components

```typescript
import { Button, Card, Input, Badge, Typography } from '@fashion-retail/design-system';

// Button with Neo-Brutalist styling
<Button variant="primary" onPress={handlePress}>
  SHOP NOW
</Button>

// Card with black border
<Card variant="brutal">
  <Typography variant="displayMedium">NEW ARRIVALS</Typography>
</Card>

// Input with focus states
<Input
  label="EMAIL ADDRESS"
  placeholder="Enter your email"
  value={email}
  onChangeText={setEmail}
/>

// Status badge
<Badge variant="accent">IN STOCK</Badge>
```

## Components

### Button
Neo-Brutalist buttons with black borders and multiple variants.

**Variants**: `primary`, `secondary`, `outline`, `ghost`  
**Sizes**: `small`, `medium`, `large`

### Card
Container with rounded corners and black borders.

**Variants**: `default`, `elevated`, `brutal`

### Input
Text input with focus states and error handling.

### Badge
Small status indicators for labels and tags.

**Variants**: `default`, `success`, `warning`, `error`, `info`, `accent`

### Typography
Pre-styled text components following the design system.

**Variants**: `displayLarge`, `displayMedium`, `displaySmall`, `body`, `bodySmall`, `label`, `caption`, `code`

### CodeBlock
Dark container (`#161616`) for displaying code snippets.

### GradientButton
Button with orange gradient (yellow → orange → red).

## Design Tokens

### Colors
```typescript
colors.ivory          // #F5EFE0 - Main background
colors.black          // #000000 - Text, borders
colors.safetyOrange   // #FF6B35 - Accents
colors.background.dark // #161616 - Code blocks
```

### Spacing
```typescript
spacing[0]  // 0px
spacing[1]  // 4px
spacing[2]  // 8px
spacing[4]  // 16px
spacing[6]  // 24px
spacing[8]  // 32px
// ... up to spacing[32] (128px)
```

### Border Radius
```typescript
borderRadius.base  // 8px - Buttons, inputs
borderRadius.lg    // 16px - Cards
borderRadius.full  // 9999px - Badges
```

### Typography Presets
```typescript
typographyPresets.displayLarge  // All-caps techno header
typographyPresets.body          // Standard body text
typographyPresets.button        // Button text (uppercase)
typographyPresets.code          // Monospace code
```

## Gradients

```typescript
// CSS gradient for web
gradients.orangeAccent // Yellow → Orange → Red

// For React Native, use react-native-linear-gradient:
import LinearGradient from 'react-native-linear-gradient';

<LinearGradient
  colors={[colors.gradientYellow, colors.safetyOrange, colors.gradientRed]}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
>
  {/* Content */}
</LinearGradient>
```

## Best Practices

1. **Always use design tokens** instead of hardcoded values
2. **Maintain the 60/30/10 color distribution** across layouts
3. **Use display font for all headers** (all-caps, extra-wide spacing)
4. **Apply black borders to cards and containers** for Neo-Brutalist aesthetic
5. **Use safety orange sparingly** for maximum impact on CTAs
6. **Prefer CSS Grid layouts** for brutal, structured designs
7. **Keep shadows minimal** - rely on borders for depth

## Examples

### Dashboard Card
```tsx
<Card variant="brutal" style={{ marginBottom: spacing[6] }}>
  <Typography variant="displaySmall" style={{ marginBottom: spacing[4] }}>
    INVENTORY OVERVIEW
  </Typography>
  <Typography variant="body">
    Track your products in real-time
  </Typography>
</Card>
```

### CTA Button with Gradient
```tsx
<GradientButton
  size="large"
  fullWidth
  onPress={handleCheckout}
>
  COMPLETE PURCHASE
</GradientButton>
```

### Form Input
```tsx
<Input
  label="PRODUCT NAME"
  placeholder="Enter product name"
  value={productName}
  onChangeText={setProductName}
  error={errors.productName}
/>
```

## Font Integration

To use custom fonts in your app:

### React Native (Expo)
```bash
npx expo install expo-font @expo-google-fonts/orbitron @expo-google-fonts/inter
```

```typescript
import { useFonts, Orbitron_900Black } from '@expo-google-fonts/orbitron';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';

export default function App() {
  const [fontsLoaded] = useFonts({
    Orbitron_900Black,
    Inter_400Regular,
    Inter_600SemiBold,
  });

  // ... rest of app
}
```

### Web (Next.js/React)
```typescript
// Import Google Fonts in _app.tsx or layout
import { Orbitron, Inter } from 'next/font/google';

const orbitron = Orbitron({ subsets: ['latin'], weight: '900' });
const inter = Inter({ subsets: ['latin'] });
```

## Contributing

When adding new components or tokens:
1. Follow the Neo-Brutalist aesthetic
2. Maintain the 60/30/10 color rule
3. Use existing tokens for consistency
4. Document usage examples
5. Export from index files

## License

MIT
