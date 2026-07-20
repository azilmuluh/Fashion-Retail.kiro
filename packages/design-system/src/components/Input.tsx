/**
 * Input Component
 * Neo-Brutalist text input with black border
 */

import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, ViewStyle, TextStyle } from 'react-native';
import { colors, borderRadius, spacing, typographyPresets, fontFamilies } from '../tokens';

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
    marginBottom: spacing[4],
  },
  label: {
    ...typographyPresets.label,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: borderRadius.base,
    padding: spacing[4],
    fontSize: 16,
    fontFamily: fontFamilies.body,
    color: colors.text.primary,
  },
  inputFocused: {
    borderColor: colors.safetyOrange,
  },
  inputError: {
    borderColor: colors.status.error,
  },
  errorText: {
    ...typographyPresets.caption,
    color: colors.status.error,
    marginTop: spacing[1],
  },
  helperText: {
    ...typographyPresets.caption,
    color: colors.text.muted,
    marginTop: spacing[1],
  },
});
