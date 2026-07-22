/**
 * Demo Dashboard Screen
 * Shows a preview of the platform with sample data
 * Allows users to explore before signing up
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  DollarSign,
  Package,
  ClipboardList,
  Users,
  MessageCircle,
  BarChart3,
  Gift,
  Bell,
  Eye,
  AlertTriangle,
  Check,
} from 'lucide-react-native';
import { colors, spacing, typography } from '@fashion-retail/design-system';

// Sample data for demo
const DEMO_DATA = {
  businessName: 'Fashion Boutique',
  totalRevenue: 2450000,
  totalOrders: 156,
  averageOrderValue: 15705,
  totalProducts: 89,
  lowStockProducts: 12,
  outOfStockProducts: 3,
  totalStockValue: 5680000,
  pendingOrders: 8,
  completedOrders: 148,
  totalCustomers: 234,
  newCustomersThisMonth: 18,
  categories: {
    'Dresses': 24,
    'Shoes': 18,
    'Accessories': 15,
    'Bags': 12,
    'Tops': 20,
  },
};

export default function DemoScreen() {
  const router = useRouter();

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} XAF`;
  };

  return (
    <View style={styles.container}>
      {/* Header with CTA */}
      <View style={styles.demoHeader}>
        <View style={styles.demoBadge}>
          <Eye size={14} color={colors.neutral.white} />
          <Text style={styles.demoBadgeText}>DEMO MODE</Text>
        </View>
        <Text style={styles.demoTitle}>Fashion Retail Platform</Text>
        <Text style={styles.demoSubtitle}>
          Explore how our platform helps fashion retailers manage their business
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>WELCOME!</Text>
          <Text style={styles.businessName}>{DEMO_DATA.businessName}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>SAMPLE DASHBOARD</Text>
          </View>
        </View>

        {/* Revenue Overview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <DollarSign size={18} color={colors.text.primary} />
            <Text style={styles.sectionTitle}>Revenue Overview</Text>
          </View>
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, styles.primaryMetric]}>
              <Text style={styles.metricValue}>{formatCurrency(DEMO_DATA.totalRevenue)}</Text>
              <Text style={styles.metricLabel}>TOTAL REVENUE</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{DEMO_DATA.totalOrders}</Text>
              <Text style={styles.metricLabel}>TOTAL ORDERS</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>
                {formatCurrency(DEMO_DATA.averageOrderValue)}
              </Text>
              <Text style={styles.metricLabel}>AVG ORDER</Text>
            </View>
          </View>
        </View>

        {/* Inventory Status */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Package size={18} color={colors.text.primary} />
            <Text style={styles.sectionTitle}>Inventory Status</Text>
          </View>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{DEMO_DATA.totalProducts}</Text>
              <Text style={styles.metricLabel}>TOTAL PRODUCTS</Text>
            </View>
            <View style={[styles.metricCard, styles.warningMetric]}>
              <Text style={styles.metricValue}>{DEMO_DATA.lowStockProducts}</Text>
              <Text style={styles.metricLabel}>LOW STOCK</Text>
            </View>
            <View style={[styles.metricCard, styles.dangerMetric]}>
              <Text style={styles.metricValue}>{DEMO_DATA.outOfStockProducts}</Text>
              <Text style={styles.metricLabel}>OUT OF STOCK</Text>
            </View>
            <View style={[styles.metricCard, styles.fullWidth]}>
              <Text style={styles.metricValue}>
                {formatCurrency(DEMO_DATA.totalStockValue)}
              </Text>
              <Text style={styles.metricLabel}>TOTAL STOCK VALUE</Text>
            </View>
          </View>
        </View>

        {/* Category Breakdown */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ClipboardList size={18} color={colors.text.primary} />
            <Text style={styles.sectionTitle}>Products by Category</Text>
          </View>
          <View style={styles.categoryList}>
            {Object.entries(DEMO_DATA.categories)
              .sort(([, a], [, b]) => b - a)
              .map(([category, count]) => (
                <View key={category} style={styles.categoryItem}>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{category.toUpperCase()}</Text>
                    <Text style={styles.categoryCount}>{count} items</Text>
                  </View>
                  <View style={styles.categoryBar}>
                    <View
                      style={[
                        styles.categoryBarFill,
                        {
                          width: `${(count / DEMO_DATA.totalProducts) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
          </View>
        </View>

        {/* Orders Status */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users size={18} color={colors.text.primary} />
            <Text style={styles.sectionTitle}>Order Status</Text>
          </View>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{DEMO_DATA.pendingOrders}</Text>
              <Text style={styles.metricLabel}>PENDING</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{DEMO_DATA.completedOrders}</Text>
              <Text style={styles.metricLabel}>COMPLETED</Text>
            </View>
          </View>
        </View>

        {/* Customers */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users size={18} color={colors.text.primary} />
            <Text style={styles.sectionTitle}>Customers</Text>
          </View>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{DEMO_DATA.totalCustomers}</Text>
              <Text style={styles.metricLabel}>TOTAL CUSTOMERS</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{DEMO_DATA.newCustomersThisMonth}</Text>
              <Text style={styles.metricLabel}>NEW THIS MONTH</Text>
            </View>
          </View>
        </View>

        {/* Features Highlight */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>✨ PLATFORM FEATURES</Text>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>💬</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureName}>WHATSAPP INTEGRATION</Text>
                <Text style={styles.featureDescription}>
                  Chat with customers directly, send product catalogs, manage orders
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>📊</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureName}>REAL-TIME ANALYTICS</Text>
                <Text style={styles.featureDescription}>
                  Track sales, inventory, and customer insights in real-time
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🎁</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureName}>LOYALTY PROGRAM</Text>
                <Text style={styles.featureDescription}>
                  Reward repeat customers with points and exclusive offers
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>📦</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureName}>INVENTORY MANAGEMENT</Text>
                <Text style={styles.featureDescription}>
                  Track stock levels, get low-stock alerts, manage suppliers
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🔔</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureName}>SMART NOTIFICATIONS</Text>
                <Text style={styles.featureDescription}>
                  Get alerts for new orders, low stock, and customer messages
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <View style={styles.ctaCard}>
            <Text style={styles.ctaTitle}>READY TO GET STARTED?</Text>
            <Text style={styles.ctaDescription}>
              Create your free account and start managing your fashion business today
            </Text>

            <TouchableOpacity
              style={styles.signupButton}
              onPress={() => router.push('/(auth)/signup')}
            >
              <Text style={styles.signupButtonText}>CREATE FREE ACCOUNT</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <Text style={styles.loginPrompt}>Already have an account?</Text>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={styles.loginButtonText}>SIGN IN</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.cream,
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
  },
  demoHeader: {
    backgroundColor: colors.primary.green,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    alignItems: 'center',
  },
  demoBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: 50,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  demoBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.white,
    letterSpacing: 0.5,
  },
  demoTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.neutral.white,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  demoSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
  },
  scrollView: {
    flex: 1,
  },
  welcomeCard: {
    backgroundColor: colors.neutral.white,
    padding: spacing.xl,
    margin: spacing.lg,
    borderRadius: 24,
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  businessName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  badge: {
    backgroundColor: colors.accent.light,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 50,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary.green,
  },
  section: {
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metricCard: {
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: 16,
    padding: spacing.lg,
    flex: 1,
    minWidth: 200,
    shadowColor: 'rgba(0, 0, 0, 0.06)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  primaryMetric: {
    backgroundColor: colors.accent.light,
    borderColor: colors.primary.green,
    borderWidth: 2,
    minWidth: '100%',
  },
  warningMetric: {
    backgroundColor: '#FFF4E6',
  },
  dangerMetric: {
    backgroundColor: '#FFEBEE',
  },
  fullWidth: {
    minWidth: '100%',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryList: {
    gap: spacing.md,
  },
  categoryItem: {
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: 16,
    padding: spacing.lg,
  },
  categoryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  categoryCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  categoryBar: {
    height: 8,
    backgroundColor: colors.primary.cream,
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    backgroundColor: colors.primary.green,
    borderRadius: 4,
  },
  featuresSection: {
    padding: spacing.lg,
    backgroundColor: colors.neutral.white,
    margin: spacing.lg,
    borderRadius: 24,
  },
  featuresTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  featuresList: {
    gap: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    backgroundColor: colors.primary.cream,
    borderRadius: 16,
    padding: spacing.lg,
  },
  featureIcon: {
    fontSize: 28,
  },
  featureContent: {
    flex: 1,
  },
  featureName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  featureDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.text.secondary,
    lineHeight: 20,
  },
  ctaSection: {
    padding: spacing.lg,
  },
  ctaCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 24,
    padding: spacing.xl,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 5,
  },
  ctaTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  ctaDescription: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.text.secondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
    lineHeight: 24,
  },
  signupButton: {
    backgroundColor: colors.primary.green,
    borderRadius: 50,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    shadowColor: 'rgba(46, 204, 113, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.white,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.primary,
    marginVertical: spacing.xl,
  },
  loginPrompt: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  loginButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary.green,
    borderRadius: 50,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary.green,
    letterSpacing: 0.5,
  },
});
