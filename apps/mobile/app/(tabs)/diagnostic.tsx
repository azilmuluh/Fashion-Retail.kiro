/**
 * Diagnostic Screen
 * Simple screen to test if routing works
 */

import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing } from '@fashion-retail/design-system';

export default function DiagnosticScreen() {
  const { user, retailer, loading } = useAuth();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🔧 Diagnostic Screen</Text>
        <Text style={styles.subtitle}>This screen loaded successfully!</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Auth Status:</Text>
          <Text style={styles.info}>Loading: {loading ? 'Yes' : 'No'}</Text>
          <Text style={styles.info}>User: {user ? '✅ Logged in' : '❌ Not logged in'}</Text>
          <Text style={styles.info}>User ID: {user?.id || 'N/A'}</Text>
          <Text style={styles.info}>Email: {user?.email || 'N/A'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Retailer Profile:</Text>
          <Text style={styles.info}>
            Status: {retailer ? '✅ Loaded' : '❌ Not loaded'}
          </Text>
          {retailer && (
            <>
              <Text style={styles.info}>Business: {retailer.business_name}</Text>
              <Text style={styles.info}>Phone: {retailer.phone_number}</Text>
              <Text style={styles.info}>WhatsApp: {retailer.whatsapp_number}</Text>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Next Steps:</Text>
          <Text style={styles.info}>
            If you see this screen, routing is working correctly.
          </Text>
          <Text style={styles.info}>
            Check the console for any errors related to other tabs.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.cream,
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 18,
    color: colors.primary.green,
    marginBottom: spacing.xl,
    fontWeight: '600',
  },
  section: {
    backgroundColor: colors.neutral.white,
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border.primary,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  info: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
});
