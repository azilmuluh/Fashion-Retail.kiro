/**
 * CodeBlock Component
 * Dark code block container for displaying code snippets
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, ScrollView } from 'react-native';
import { colors, borderRadius, spacing, typographyPresets } from '../tokens';

export interface CodeBlockProps {
  children: React.ReactNode;
  language?: string;
  containerStyle?: ViewStyle;
  textStyle?: TextStyle;
  scrollable?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  children,
  language,
  containerStyle,
  textStyle,
  scrollable = true,
}) => {
  const content = (
    <View style={[styles.container, containerStyle]}>
      {language && (
        <View style={styles.languageTag}>
          <Text style={styles.languageText}>{language.toUpperCase()}</Text>
        </View>
      )}
      <Text style={[styles.code, textStyle]}>{children}</Text>
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {content}
      </ScrollView>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.dark,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.black,
    padding: spacing[4],
    position: 'relative',
  },
  languageTag: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    backgroundColor: colors.primary.green,
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.sm,
  },
  languageText: {
    ...typographyPresets.caption,
    color: colors.white,
    fontSize: 10,
  },
  code: {
    ...typographyPresets.code,
    color: colors.text.inverse,
  },
});
