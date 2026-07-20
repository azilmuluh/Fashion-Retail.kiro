/**
 * Fashion Retail Platform - Design Tokens: Border Radius
 * HopeRise-inspired: Soft, rounded, pill-shaped components
 */

export const borderRadius = {
  none: 0,
  sm: 8,
  base: 12,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 50,      // Pill-shaped buttons
  full: 9999,    // For circular elements
} as const;

export type BorderRadius = typeof borderRadius;

// Common border radius patterns - HopeRise style
export const borderRadiusPresets = {
  card: borderRadius.lg,        // Rounded cards
  button: borderRadius.pill,     // Pill-shaped buttons
  input: borderRadius.md,        // Rounded inputs
  badge: borderRadius.full,      // Circular badges
  image: borderRadius.xl,        // Soft oval/capsule frames
  container: borderRadius.lg,    // Container elements
} as const;
