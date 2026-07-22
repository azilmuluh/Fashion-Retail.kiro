/**
 * GradientButton Component
 * Button with safety orange gradient (yellow-red)
 * Note: For React Native, gradient requires additional library (react-native-linear-gradient)
 * This is a placeholder that can be enhanced with actual gradient support
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { colors, borderRadius, spacing, typographyPresets } from '../tokens';
import { ButtonSize } from './Button';

export interface GradientButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  children,
  onPress,
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
}) => {
  const getButtonStyle = (): ViewStyle => {
    const base: ViewStyle = {
      borderRadius: borderRadius.base,
      borderWidth: 2,
      borderColor: colors.black,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      // Using solid color as fallback
      // In production, wrap with LinearGradient from react-native-linear-gradient
      backgroundColor: colors.primary.green,
    };

    const sizeStyles: Record<ButtonSize, ViewStyle> = {
      small: {
        paddingVertical: spacing[2],
        paddingHorizontal: spacing[4],
      },
      medium: {
        paddingVertical: spacing[3],
        paddingHorizontal: spacing[6],
      },
      large: {
        paddingVertical: spacing[4],
        paddingHorizontal: spacing[8],
      },
    };

    return {
      ...base,
      ...sizeStyles[size],
      ...(fullWidth && { width: '100%' }),
      ...(disabled && { opacity: 0.5 }),
    };
  };

  const getTextStyle = (): TextStyle => {
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

    return {
      ...typographyPresets.button,
      color: colors.white,
      ...sizeStyles[size],
    };
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[getButtonStyle(), style]}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{children}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Additional styles if needed
});

// TODO: For production, enhance with react-native-linear-gradient:
// import LinearGradient from 'react-native-linear-gradient';
// <LinearGradient
//   colors={[colors.gradientYellow, colors.safetyOrange, colors.gradientRed]}
//   start={{ x: 0, y: 0 }}
//   end={{ x: 1, y: 1 }}
//   style={getButtonStyle()}
// >
//   {content}
// </LinearGradient>
