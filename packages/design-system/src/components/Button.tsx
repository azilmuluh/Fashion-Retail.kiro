/**
 * Button Component
 * HopeRise-inspired: Pill-shaped, soft, empathetic design
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator, Platform } from 'react-native';
import { colors, borderRadius, spacing, typographyPresets } from '../tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
}) => {
  const getButtonStyle = (): ViewStyle => {
    const base: ViewStyle = {
      borderRadius: borderRadius.pill,
      borderWidth: 0,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      // cursor: Platform.OS === 'web' ? 'pointer' : undefined, // Not supported in React Native StyleSheet
      // transition: Platform.OS === 'web' ? 'all 0.3s ease' : undefined, // Not supported in React Native
      shadowColor: 'rgba(0, 0, 0, 0.1)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 2,
    };

    // Size variations
    const sizeStyles: Record<ButtonSize, ViewStyle> = {
      small: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.lg,
      },
      medium: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xl,
      },
      large: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing['2xl'],
      },
    };

    // Variant styles
    const variantStyles: Record<ButtonVariant, ViewStyle> = {
      primary: {
        backgroundColor: colors.primary.green,
      },
      secondary: {
        backgroundColor: colors.neutral.beige,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: colors.primary.green,
      },
      ghost: {
        backgroundColor: 'transparent',
        shadowOpacity: 0,
        elevation: 0,
      },
    };

    return {
      ...base,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...(fullWidth && { width: '100%' }),
      ...(disabled && { opacity: 0.5, cursor: 'not-allowed' }),
    };
  };

  const getTextStyle = (): TextStyle => {
    const base: TextStyle = {
      fontWeight: '600',
      letterSpacing: 0.5,
    };

    // Size variations
    const sizeStyles: Record<ButtonSize, TextStyle> = {
      small: {
        fontSize: 14,
      },
      medium: {
        fontSize: 16,
      },
      large: {
        fontSize: 18,
      },
    };

    // Variant text colors
    const variantTextStyles: Record<ButtonVariant, TextStyle> = {
      primary: {
        color: colors.neutral.white,
      },
      secondary: {
        color: colors.text.primary,
      },
      outline: {
        color: colors.primary.green,
      },
      ghost: {
        color: colors.text.primary,
      },
    };

    return {
      ...base,
      ...sizeStyles[size],
      ...variantTextStyles[variant],
    };
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[getButtonStyle(), style]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.neutral.white : colors.primary.green} />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{children}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Additional styles if needed
});
