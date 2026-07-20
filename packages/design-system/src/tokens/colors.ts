/**
 * Fashion Retail Platform - Design Tokens: Colors
 * HopeRise-inspired: Warm, empathetic, modern aesthetic
 * 
 * Color Distribution:
 * - Primary: Soft cream and beige backgrounds
 * - Accent: Vibrant leaf-green for CTAs
 * - Text: Dark charcoal for readability
 */

export const colors = {
  // Primary colors - HopeRise palette
  primary: {
    green: '#2ECC71',      // Vibrant leaf-green for CTAs
    greenHover: '#27AE60', // Darker green for hover
    greenLight: '#E8F8F0', // Light green for backgrounds
    cream: '#F8F5EE',      // Soft cream background
    beige: '#EAE3D2',      // Warm beige
    white: '#FFFFFF',      // Crisp white
    charcoal: '#1C1C1C',   // Dark charcoal text
    grayText: '#4A4A4A',   // Secondary text
    grayLight: '#E5E5E5',  // Light gray for borders
  },
  
  // Neutral colors (for compatibility)
  neutral: {
    ivory: '#F8F5EE',      // Soft cream
    white: '#FFFFFF',      // Crisp white
    gray: '#4A4A4A',       // Gray text
    lightGray: '#E5E5E5',  // Light gray
    cream: '#F8F5EE',
    beige: '#EAE3D2',
  },
  
  // Semantic Colors
  background: {
    primary: '#F8F5EE',    // Soft cream
    secondary: '#FFFFFF',  // Pure white for cards
    accent: '#EAE3D2',     // Warm beige
    dark: '#1C1C1C',       // Dark charcoal
    overlay: 'rgba(28, 28, 28, 0.5)',
  },
  
  text: {
    primary: '#1C1C1C',    // Dark charcoal
    secondary: '#4A4A4A',  // Gray text
    inverse: '#FFFFFF',    // White on dark backgrounds
    muted: '#9E9E9E',      // Muted text
  },
  
  border: {
    primary: '#E5E5E5',    // Light gray borders
    secondary: '#EAE3D2',  // Beige borders
  },
  
  accent: {
    primary: '#2ECC71',    // Leaf green
    hover: '#27AE60',      // Darker green for hover
    active: '#229954',     // Even darker for active
    light: '#E8F8F0',      // Light green background
  },
  
  // Status Colors
  status: {
    success: '#2ECC71',
    warning: '#F39C12',
    error: '#E74C3C',
    info: '#3498DB',
  },
  
  // Legacy compatibility
  white: '#FFFFFF',
  black: '#1C1C1C',
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E5E5E5',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#1C1C1C',
  },
} as const;

export type Colors = typeof colors;

// Gradient Definitions
export const gradients = {
  greenAccent: `linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)`,
  creamOverlay: `linear-gradient(180deg, rgba(248, 245, 238, 0) 0%, rgba(248, 245, 238, 0.9) 100%)`,
} as const;

export type Gradients = typeof gradients;
