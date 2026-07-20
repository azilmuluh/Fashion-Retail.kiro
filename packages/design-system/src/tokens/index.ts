/**
 * Fashion Retail Platform - Design Tokens
 * Centralized export for all design tokens
 */

export * from './colors';
export * from './typography';
export * from './spacing';
export * from './borderRadius';
export * from './shadows';

// Theme object combining all tokens
import { colors, gradients } from './colors';
import { fontFamilies, fontSizes, fontWeights, lineHeights, letterSpacing, typographyPresets } from './typography';
import { spacing, spacingPresets } from './spacing';
import { borderRadius, borderRadiusPresets } from './borderRadius';
import { shadows } from './shadows';

export const theme = {
  colors,
  gradients,
  typography: {
    fontFamilies,
    fontSizes,
    fontWeights,
    lineHeights,
    letterSpacing,
    presets: typographyPresets,
  },
  spacing,
  spacingPresets,
  borderRadius,
  borderRadiusPresets,
  shadows,
} as const;

export type Theme = typeof theme;
