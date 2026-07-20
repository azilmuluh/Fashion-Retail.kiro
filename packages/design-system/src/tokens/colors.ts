/**
 * Fashion Retail Platform - Design Tokens: Colors
 * Neo-Brutalist, Retro-Futuristic Aesthetic
 * 
 * Color Distribution (60/30/10 Rule):
 * - 60% Ivory (backgrounds, large areas)
 * - 30% Black (text, borders, structural elements)
 * - 10% Safety Orange (accents, CTAs, highlights)
 */

export const colors = {
  // Primary Palette (60/30/10)
  ivory: '#F5EFE0',        // 60% - Main background
  black: '#000000',        // 30% - Text, borders
  safetyOrange: '#FF6B35', // 10% - Accents, CTAs
  
  // Gradient Colors (for orange accent)
  gradientYellow: '#FFB627',
  gradientRed: '#FF4500',
  
  // Semantic Colors
  background: {
    primary: '#F5EFE0',    // Ivory
    secondary: '#FFFFFF',  // Pure white for cards
    dark: '#161616',       // Dark code blocks
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  
  text: {
    primary: '#000000',    // Black
    secondary: '#333333',  // Slightly lighter for secondary text
    inverse: '#F5EFE0',    // Ivory on dark backgrounds
    muted: '#666666',      // Muted text
  },
  
  border: {
    primary: '#000000',    // Neo-Brutalist black borders
    secondary: '#CCCCCC',  // Lighter borders for subtle dividers
  },
  
  accent: {
    primary: '#FF6B35',    // Safety orange
    hover: '#FF8556',      // Lighter orange for hover states
    active: '#E55A28',     // Darker orange for active states
  },
  
  // Status Colors (with Neo-Brutalist treatment)
  status: {
    success: '#00C853',
    warning: '#FF6B35',    // Using accent orange
    error: '#FF1744',
    info: '#2196F3',
  },
  
  // Utility Colors
  white: '#FFFFFF',
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
} as const;

export type Colors = typeof colors;

// Gradient Definitions
export const gradients = {
  orangeAccent: `linear-gradient(135deg, ${colors.gradientYellow} 0%, ${colors.safetyOrange} 50%, ${colors.gradientRed} 100%)`,
  darkOverlay: `linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.8) 100%)`,
} as const;

export type Gradients = typeof gradients;
