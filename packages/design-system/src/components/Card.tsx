/**
 * Card Component
 * Neo-Brutalist card with black border and rounded corners
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius, spacing, shadows } from '../tokens';

export type CardVariant = 'default' | 'elevated' | 'brutal';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: keyof typeof spacing;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 6,
  style,
}) => {
  const getCardStyle = (): ViewStyle => {
    const base: ViewStyle = {
      backgroundColor: colors.white,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.black,
      padding: spacing[padding],
    };

    const variantStyles: Record<CardVariant, ViewStyle> = {
      default: {},
      elevated: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
      brutal: {
        shadowColor: colors.black,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 0,
      },
    };

    return {
      ...base,
      ...variantStyles[variant],
    };
  };

  return <View style={[getCardStyle(), style]}>{children}</View>;
};

const styles = StyleSheet.create({
  // Additional styles if needed
});
