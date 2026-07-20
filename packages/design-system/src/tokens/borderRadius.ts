/**
 * Fashion Retail Platform - Design Tokens: Border Radius
 * Neo-Brutalist aesthetic with rounded corners
 */

export const borderRadius = {
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999, // For circular elements
} as const;

export type BorderRadius = typeof borderRadius;

// Common border radius patterns
export const borderRadiusPresets = {
  card: borderRadius.lg,
  button: borderRadius.base,
  input: borderRadius.base,
  badge: borderRadius.full,
  image: borderRadius.md,
} as const;
