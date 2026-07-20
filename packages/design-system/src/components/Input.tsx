/**
 * Input Component
 * HopeRise-inspired: Rounded, soft, empathetic design
 */

import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, ViewStyle, TextStyle } from 'react-native';
import { colors, borderRadius, spacing, fontFamilies } from '../tokens';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  containerStyle,
  inputStyle,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        {...textInputProps}
        onFocus={(e) => {
          setIsFocused(true);
          textInputProps.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          textInputProps.onBlur?.(e);
        }}
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          error && styles.inputError,
          inputStyle,
        ]}
        placeholderTextColor={colors.text.muted}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
      {helperText && !error && <Text style={styles.helperText}>{helperText}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    fontFamily: fontFamilies.body,
    color: colors.text.primary,
    transition: 'all 0.3s ease',
  },
  inputFocused: {
    borderColor: colors.primary.green,
    borderWidth: 2,
    shadowColor: 'rgba(46, 204, 113, 0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  inputError: {
    borderColor: colors.status.error,
  },
  errorText: {
    fontSize: 12,
    color: colors.status.error,
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: spacing.xs,
  },
});
