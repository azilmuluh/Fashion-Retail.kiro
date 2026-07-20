/**
 * Typography Component
 * Pre-styled text components following Neo-Brutalist design
 */

import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { typographyPresets, colors } from '../tokens';

export type TypographyVariant = 
  | 'displayLarge'
  | 'displayMedium'
  | 'displaySmall'
  | 'bodyLarge'
  | 'body'
  | 'bodySmall'
  | 'button'
  | 'label'
  | 'caption'
  | 'code';

export interface TypographyProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  children: React.ReactNode;
}

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  color = colors.text.primary,
  style,
  children,
  ...props
}) => {
  const getTextStyle = (): TextStyle => {
    return {
      ...typographyPresets[variant],
      color,
    };
  };

  return (
    <Text style={[getTextStyle(), style]} {...props}>
      {children}
    </Text>
  );
};

// Convenience components for common use cases
export const Heading1: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="displayLarge" {...props} />
);

export const Heading2: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="displayMedium" {...props} />
);

export const Heading3: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="displaySmall" {...props} />
);

export const BodyText: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="body" {...props} />
);

export const Caption: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="caption" {...props} />
);

export const Label: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="label" {...props} />
);
