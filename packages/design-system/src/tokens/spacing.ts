/**
 * Fashion Retail Platform - Design Tokens: Spacing
 * Consistent spacing scale for margins, padding, and gaps
 */

export const spacing = {
  // Named spacing (for easy access)
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  
  // Numbered spacing (for backward compatibility)
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
  32: 128,
} as const;

export type Spacing = typeof spacing;

// Common spacing patterns
export const spacingPresets = {
  cardPadding: spacing.md,
  sectionMargin: spacing.lg,
  elementGap: spacing.sm,
  screenPadding: spacing.md,
  inputPadding: spacing.sm,
  buttonPadding: {
    vertical: spacing.sm,
    horizontal: spacing.md,
  },
} as const;
