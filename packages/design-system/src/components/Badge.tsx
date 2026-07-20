/**
 * Badge Component
 * Small status indicator with Neo-Brutalist styling
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, borderRadius, spacing, typographyPresets } from '../tokens';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'accent';
export type BadgeSize = 'small' | 'medium' | 'large';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'medium',
  style,
  textStyle,
}) => {
  const getBadgeStyle = (): ViewStyle => {
    const base: ViewStyle = {
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: colors.black,
      alignSelf: 'flex-start',
      alignItems: 'center',
      justifyContent: 'center',
    };

    const sizeStyles: Record<BadgeSize, ViewStyle> = {
      small: {
        paddingVertical: spacing[1],
        paddingHorizontal: spacing[2],
      },
      medium: {
        paddingVertical: spacing[2],
        paddingHorizontal: spacing[3],
      },
      large: {
        paddingVertical: spacing[3],
        paddingHorizontal: spacing[4],
      },
    };

    const variantStyles: Record<BadgeVariant, ViewStyle> = {
      default: {
        backgroundColor: colors.gray[200],
      },
      success: {
        backgroundColor: colors.status.success,
      },
      warning: {
        backgroundColor: colors.status.warning,
      },
      error: {
        backgroundColor: colors.status.error,
      },
      info: {
        backgroundColor: colors.status.info,
      },
      accent: {
        backgroundColor: colors.safetyOrange,
      },
    };

    return {
      ...base,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  const getTextStyle = (): TextStyle => {
    const sizeStyles: Record<BadgeSize, TextStyle> = {
      small: {
        fontSize: 10,
      },
      medium: {
        fontSize: 12,
      },
      large: {
        fontSize: 14,
      },
    };

    const variantTextStyles: Record<BadgeVariant, TextStyle> = {
      default: {
        color: colors.text.primary,
      },
      success: {
        color: colors.white,
      },
      warning: {
        color: colors.white,
      },
      error: {
        color: colors.white,
      },
      info: {
        color: colors.white,
      },
      accent: {
        color: colors.white,
      },
    };

    return {
      ...typographyPresets.label,
      ...sizeStyles[size],
      ...variantTextStyles[variant],
    };
  };

  return (
    <View style={[getBadgeStyle(), style]}>
      <Text style={[getTextStyle(), textStyle]}>{children}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // Additional styles if needed
});
