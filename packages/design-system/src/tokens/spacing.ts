/**
 * Fashion Retail Platform - Design Tokens: Spacing
 * Consistent spacing scale for margins, padding, and gaps
 */

export const spacing = {
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
  cardPadding: spacing[6],
  sectionMargin: spacing[8],
  elementGap: spacing[4],
  screenPadding: spacing[5],
  inputPadding: spacing[4],
  buttonPadding: {
    vertical: spacing[3],
    horizontal: spacing[6],
  },
} as const;
