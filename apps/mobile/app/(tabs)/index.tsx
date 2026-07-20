import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  AlertTriangle,
  XCircle,
} from 'lucide-react-native';
import { colors, spacing, typography } from '@fashion-retail/design-system';

interface AnalyticsData {
  // Inventory
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalStockValue: number;
  categoryBreakdown: Record<string, number>;

  // Sales
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  averageOrderValue: number;

  // Customers
  totalCustomers: number;
  newCustomersThisMonth: number;
}

export default function DashboardScreen() {
  const { retailer } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*');

      if (productsError) throw productsError;

      // Fetch orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*');

      if (ordersError) throw ordersError;

      // Fetch customers
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('*');

      if (customersError) throw customersError;

      // Calculate inventory metrics
      const totalProducts = products?.length || 0;
      const lowStockProducts =
        products?.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold)
          .length || 0;
      const outOfStockProducts =
        products?.filter((p) => p.stock_quantity === 0).length || 0;
      const totalStockValue =
        products?.reduce((sum, p) => sum + p.price * p.stock_quantity, 0) || 0;

      // Category breakdown
      const categoryBreakdown: Record<string, number> = {};
      products?.forEach((p) => {
        categoryBreakdown[p.category] = (categoryBreakdown[p.category] || 0) + 1;
      });

      // Calculate sales metrics
      const totalOrders = orders?.length || 0;
      const pendingOrders =
        orders?.filter(
          (o) => o.status === 'pending' || o.status === 'confirmed' || o.status === 'processing'
        ).length || 0;
      const totalRevenue = orders?.reduce((sum, o) => sum + o.total_amount, 0) || 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Calculate customer metrics
      const totalCustomers = customers?.length || 0;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const newCustomersThisMonth =
        customers?.filter((c) => new Date(c.created_at) >= thirtyDaysAgo).length || 0;

      setAnalytics({
        totalProducts,
        lowStockProducts,
        outOfStockProducts,
        totalStockValue,
        categoryBreakdown,
        totalOrders,
        pendingOrders,
        totalRevenue,
        averageOrderValue,
        totalCustomers,
        newCustomersThisMonth,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} XAF`;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary.green} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary.green}
        />
      }
    >
      {/* Welcome Card */}
      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeTitle}>WELCOME BACK!</Text>
        <Text style={styles.businessName}>{retailer?.business_name}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>DASHBOARD</Text>
        </View>
      </View>

      {/* Revenue Overview */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <DollarSign size={20} color={colors.text.primary} />
          <Text style={styles.sectionTitle}>Revenue Overview</Text>
        </View>
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, styles.primaryMetric]}>
            <Text style={styles.metricValue}>{formatCurrency(analytics?.totalRevenue || 0)}</Text>
            <Text style={styles.metricLabel}>TOTAL REVENUE</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{analytics?.totalOrders || 0}</Text>
            <Text style={styles.metricLabel}>TOTAL ORDERS</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {formatCurrency(analytics?.averageOrderValue || 0)}
            </Text>
            <Text style={styles.metricLabel}>AVG ORDER</Text>
          </View>
        </View>
      </View>

      {/* Inventory Status */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Package size={20} color={colors.text.primary} />
          <Text style={styles.sectionTitle}>Inventory Status</Text>
        </View>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{analytics?.totalProducts || 0}</Text>
            <Text style={styles.metricLabel}>TOTAL PRODUCTS</Text>
          </View>
          <View style={[styles.metricCard, analytics?.lowStockProducts && styles.warningMetric]}>
            <Text style={styles.metricValue}>{analytics?.lowStockProducts || 0}</Text>
            <Text style={styles.metricLabel}>LOW STOCK ⚠️</Text>
          </View>
          <View style={[styles.metricCard, analytics?.outOfStockProducts && styles.dangerMetric]}>
            <Text style={styles.metricValue}>{analytics?.outOfStockProducts || 0}</Text>
            <Text style={styles.metricLabel}>OUT OF STOCK 🚫</Text>
          </View>
          <View style={[styles.metricCard, styles.fullWidth]}>
            <Text style={styles.metricValue}>
              {formatCurrency(analytics?.totalStockValue || 0)}
            </Text>
            <Text style={styles.metricLabel}>TOTAL STOCK VALUE</Text>
          </View>
        </View>
      </View>

      {/* Category Breakdown */}
      {analytics?.categoryBreakdown && Object.keys(analytics.categoryBreakdown).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📂 PRODUCTS BY CATEGORY</Text>
          <View style={styles.categoryList}>
            {Object.entries(analytics.categoryBreakdown)
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
                          width: `${
                            (count / (analytics?.totalProducts || 1)) * 100
                          }%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
          </View>
        </View>
      )}

      {/* Orders Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 ORDERS STATUS</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{analytics?.pendingOrders || 0}</Text>
            <Text style={styles.metricLabel}>PENDING</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {(analytics?.totalOrders || 0) - (analytics?.pendingOrders || 0)}
            </Text>
            <Text style={styles.metricLabel}>COMPLETED</Text>
          </View>
        </View>
      </View>

      {/* Customers */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👥 CUSTOMERS</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{analytics?.totalCustomers || 0}</Text>
            <Text style={styles.metricLabel}>TOTAL CUSTOMERS</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{analytics?.newCustomersThisMonth || 0}</Text>
            <Text style={styles.metricLabel}>NEW THIS MONTH</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.cream,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary.cream,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  welcomeCard: {
    backgroundColor: colors.primary.green,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    padding: spacing.xl,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.neutral.white,
    marginBottom: spacing.xs,
  },
  businessName: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: spacing.md,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 50,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.white,
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
});
