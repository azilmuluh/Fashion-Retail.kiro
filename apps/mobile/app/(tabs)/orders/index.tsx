import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, CheckCircle, Package, Truck, XCircle, ShoppingBag, User, CreditCard, Calendar, MapPin } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Order } from '@fashion-retail/shared';
import { colors, spacing } from '@fashion-retail/design-system';

interface OrderWithDetails extends Order {
  customer?: { name: string; phone_number: string };
  order_items_count?: number;
}

export default function OrdersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'processing'>('all');

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  useEffect(() => {
    const subscription = subscribeToOrders();
    return () => {
      if (subscription) subscription();
    };
  }, []);

  const fetchOrders = async () => {
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          customer:customers (name, phone_number),
          order_items (id)
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const ordersWithCount = (data || []).map((order: any) => ({
        ...order,
        order_items_count: order.order_items?.length || 0,
      }));

      setOrders(ordersWithCount);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const subscribeToOrders = () => {
    const subscription = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: colors.status.warning,
      confirmed: colors.primary.green,
      processing: colors.status.info,
      fulfilled: colors.status.success,
      delivered: colors.status.success,
      cancelled: colors.status.error,
    };
    return statusColors[status] || colors.status.warning;
  };

  const getStatusIcon = (status: string) => {
    const iconProps = { size: 14, color: colors.neutral.white };
    const icons: Record<string, JSX.Element> = {
      pending: <Clock {...iconProps} />,
      confirmed: <CheckCircle {...iconProps} />,
      processing: <Package {...iconProps} />,
      fulfilled: <Truck {...iconProps} />,
      delivered: <CheckCircle {...iconProps} />,
      cancelled: <XCircle {...iconProps} />,
    };
    return icons[status] || <Clock {...iconProps} />;
  };

  const getPaymentStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#FFA726',
      partial: '#29B6F6',
      paid: '#66BB6A',
      refunded: '#EF5350',
    };
    return colors[status] || '#FFA726';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} XAF`;
  };

  const renderOrderCard = ({ item, index }: { item: OrderWithDetails; index: number }) => {
    const fadeAnim = new Animated.Value(0);
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay: index * 50,
      useNativeDriver: true,
    }).start();

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push(`/orders/${item.id}`)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.orderNumber}>
              #{item.id.substring(0, 8).toUpperCase()}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              {getStatusIcon(item.status)}
              <Text style={styles.statusText}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>

          <View style={styles.customerInfo}>
            <View style={styles.customerRow}>
              <User size={16} color={colors.text.secondary} />
              <Text style={styles.customerName}>
                {item.customer?.name || 'Unknown Customer'}
              </Text>
            </View>
            {item.customer?.phone_number && (
              <Text style={styles.customerPhone}>{item.customer.phone_number}</Text>
            )}
          </View>

          <View style={styles.orderDetails}>
            <View style={styles.detailRow}>
              <View style={styles.detailLabelRow}>
                <ShoppingBag size={14} color={colors.text.secondary} />
                <Text style={styles.detailLabel}>Items</Text>
              </View>
              <Text style={styles.detailValue}>{item.order_items_count || 0}</Text>
            </View>
            <View style={styles.detailRow}>
              <View style={styles.detailLabelRow}>
                <CreditCard size={14} color={colors.text.secondary} />
                <Text style={styles.detailLabel}>Total</Text>
              </View>
              <Text style={styles.detailValue}>{formatCurrency(item.total_amount)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment</Text>
              <View
                style={[
                  styles.paymentBadge,
                  { backgroundColor: getPaymentStatusColor(item.payment_status) },
                ]}
              >
                <Text style={styles.paymentText}>
                  {item.payment_status.charAt(0).toUpperCase() + item.payment_status.slice(1)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.footerItem}>
              <Calendar size={12} color={colors.text.secondary} />
              <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
            </View>
            {item.delivery_method && (
              <View style={styles.footerItem}>
                {item.delivery_method === 'pickup' ? (
                  <MapPin size={12} color={colors.primary.green} />
                ) : (
                  <Truck size={12} color={colors.primary.green} />
                )}
                <Text style={styles.deliveryText}>
                  {item.delivery_method === 'pickup' ? 'Pickup' : 'Delivery'}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderFilterButton = (value: typeof filter, label: string, icon: JSX.Element) => (
    <TouchableOpacity
      key={value}
      style={[styles.filterButton, filter === value && styles.filterButtonActive]}
      onPress={() => setFilter(value)}
    >
      {icon}
      <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary.green} />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        {renderFilterButton('all', 'All', <ShoppingBag size={16} color={filter === 'all' ? colors.neutral.white : colors.text.primary} />)}
        {renderFilterButton('pending', 'Pending', <Clock size={16} color={filter === 'pending' ? colors.neutral.white : colors.status.warning} />)}
        {renderFilterButton('confirmed', 'Confirmed', <CheckCircle size={16} color={filter === 'confirmed' ? colors.neutral.white : colors.primary.green} />)}
        {renderFilterButton('processing', 'Processing', <Package size={16} color={filter === 'processing' ? colors.neutral.white : colors.status.info} />)}
      </View>

      <View style={styles.statsHeader}>
        <ShoppingBag size={16} color={colors.neutral.white} />
        <Text style={styles.statsText}>
          {orders.length} Order{orders.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrderCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary.green}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ShoppingBag size={64} color={colors.border.primary} />
            <Text style={styles.emptyText}>
              {filter === 'all' ? 'No orders yet' : `No ${filter} orders`}
            </Text>
            <Text style={styles.emptySubtext}>
              Orders will appear here when customers place them
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.cream,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary.cream,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.primary.cream,
    gap: spacing.sm,
  },
  filterButton: {
    flex: 1,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: 50,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  filterButtonActive: {
    backgroundColor: colors.primary.green,
    borderColor: colors.primary.green,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  filterTextActive: {
    color: colors.neutral.white,
  },
  statsHeader: {
    backgroundColor: colors.primary.green,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  statsText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  listContent: {
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.white,
  },
  customerInfo: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  customerPhone: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
    marginLeft: 24,
  },
  orderDetails: {
    backgroundColor: colors.primary.cream,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  paymentBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 50,
  },
  paymentText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.white,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  deliveryText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary.green,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['2xl'] * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
