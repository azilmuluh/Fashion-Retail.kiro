/**
 * Fashion Retail Platform - Design Tokens: Typography
 * Neo-Brutalist, Retro-Futuristic Aesthetic
 * 
 * Font Strategy:
 * - Display: Ultra-wide extended techno font for all-caps headers
 * - Body: Geometric sans-serif for readability
 */

// Font Families
export const fontFamilies = {
  // Display font for headers (ultra-wide extended techno)
  // Using system fonts as fallback, recommend custom font integration:
  // - Orbitron (Google Fonts - geometric, futuristic)
  // - Space Grotesk (Google Fonts - extended, geometric)
  // - Eurostile Extended (Adobe Fonts - classic techno)
  display: "'Orbitron', 'Space Grotesk', 'Arial Black', sans-serif",
  
  // Body font (geometric sans-serif)
  // - Inter (Google Fonts - geometric, modern)
  // - DM Sans (Google Fonts - geometric, readable)
  body: "'Inter', 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  
  // Monospace for code blocks
  mono: "'SF Mono', 'Roboto Mono', 'Consolas', monospace",
} as const;

// Font Sizes (responsive scale)
export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
  '6xl': 60,
  '7xl': 72,
} as const;

// Font Weights
export const fontWeights = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  black: '900', // For display headers
} as const;

// Line Heights
export const lineHeights = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
  loose: 2,
} as const;

// Letter Spacing (important for techno aesthetic)
export const letterSpacing = {
  tight: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1,
  widest: 2,      // For display headers
  extraWide: 4,   // For ultra-wide techno headers
} as const;

// Text Transform Utilities
export const textTransform = {
  uppercase: 'uppercase',
  lowercase: 'lowercase',
  capitalize: 'capitalize',
  none: 'none',
} as const;

// Typography Presets (combining multiple properties)
export const typographyPresets = {
  // Display Headers (all-caps techno)
  displayLarge: {
    fontFamily: fontFamilies.display,
    fontSize: fontSizes['6xl'],
    fontWeight: fontWeights.black,
    letterSpacing: letterSpacing.extraWide,
    textTransform: textTransform.uppercase,
    lineHeight: lineHeights.tight,
  },
  displayMedium: {
    fontFamily: fontFamilies.display,
    fontSize: fontSizes['4xl'],
    fontWeight: fontWeights.black,
    letterSpacing: letterSpacing.widest,
    textTransform: textTransform.uppercase,
    lineHeight: lineHeights.tight,
  },
  displaySmall: {
    fontFamily: fontFamilies.display,
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacing.wider,
    textTransform: textTransform.uppercase,
    lineHeight: lineHeights.tight,
  },
  
  // Body Text (geometric sans-serif)
  bodyLarge: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.normal,
    letterSpacing: letterSpacing.normal,
    lineHeight: lineHeights.relaxed,
  },
  body: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.normal,
    letterSpacing: letterSpacing.normal,
    lineHeight: lineHeights.normal,
  },
  bodySmall: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.normal,
    letterSpacing: letterSpacing.normal,
    lineHeight: lineHeights.normal,
  },
  
  // UI Elements
  button: {
    fontFamily: fontFamilies.display,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacing.wide,
    textTransform: textTransform.uppercase,
  },
  label: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacing.normal,
    textTransform: textTransform.uppercase,
  },
  caption: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.normal,
    letterSpacing: letterSpacing.normal,
    lineHeight: lineHeights.normal,
  },
  
  // Code
  code: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.normal,
    letterSpacing: letterSpacing.tight,
    lineHeight: lineHeights.relaxed,
  },
} as const;

export type FontFamilies = typeof fontFamilies;
export type FontSizes = typeof fontSizes;
export type FontWeights = typeof fontWeights;
export type TypographyPresets = typeof typographyPresets;

// Export a combined typography object for easy access
export const typography = {
  families: fontFamilies,
  sizes: fontSizes,
  weights: fontWeights,
  lineHeights,
  letterSpacing,
  textTransform,
  presets: typographyPresets,
} as const;
