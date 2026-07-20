import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Order } from '@fashion-retail/shared';
import { colors, spacing, typography } from '@fashion-retail/design-system';

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
    subscribeToOrders();
  }, [filter]);

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
      pending: colors.neutral.gray,
      confirmed: colors.primary.orange,
      processing: colors.primary.orange,
      fulfilled: '#4CAF50',
      delivered: '#4CAF50',
      cancelled: '#F44336',
    };
    return statusColors[status] || colors.neutral.gray;
  };

  const getStatusEmoji = (status: string) => {
    const emojis: Record<string, string> = {
      pending: '⏳',
      confirmed: '✅',
      processing: '📦',
      fulfilled: '🚚',
      delivered: '✨',
      cancelled: '❌',
    };
    return emojis[status] || '📋';
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

  const renderOrderCard = ({ item }: { item: OrderWithDetails }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/orders/${item.id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.orderNumber}>
          #{item.id.substring(0, 8).toUpperCase()}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>
            {getStatusEmoji(item.status)} {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>
          👤 {item.customer?.name || 'Unknown Customer'}
        </Text>
        <Text style={styles.customerPhone}>{item.customer?.phone_number}</Text>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>📦 Items:</Text>
          <Text style={styles.detailValue}>{item.order_items_count || 0}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>💰 Total:</Text>
          <Text style={styles.detailValue}>{formatCurrency(item.total_amount)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>💳 Payment:</Text>
          <View
            style={[
              styles.paymentBadge,
              { backgroundColor: getPaymentStatusColor(item.payment_status) },
            ]}
          >
            <Text style={styles.paymentText}>{item.payment_status.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>📅 {formatDate(item.created_at)}</Text>
        {item.delivery_method && (
          <Text style={styles.deliveryText}>
            {item.delivery_method === 'pickup' ? '🏪 PICKUP' : '🚚 DELIVERY'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderFilterButton = (value: typeof filter, label: string) => (
    <TouchableOpacity
      key={value}
      style={[styles.filterButton, filter === value && styles.filterButtonActive]}
      onPress={() => setFilter(value)}
    >
      <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary.orange} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        {renderFilterButton('all', 'ALL')}
        {renderFilterButton('pending', 'PENDING')}
        {renderFilterButton('confirmed', 'CONFIRMED')}
        {renderFilterButton('processing', 'PROCESSING')}
      </View>

      <View style={styles.statsHeader}>
        <Text style={styles.statsText}>
          {orders.length} ORDER{orders.length !== 1 ? 'S' : ''}
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
            tintColor={colors.primary.orange}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {filter === 'all' ? 'No orders yet' : `No ${filter} orders`}
            </Text>
            <Text style={styles.emptySubtext}>
              Orders will appear here when customers place them via WhatsApp
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
    backgroundColor: colors.neutral.ivory,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral.ivory,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: spacing.sm,
    backgroundColor: colors.neutral.ivory,
    borderBottomWidth: 4,
    borderBottomColor: colors.primary.black,
    gap: spacing.sm,
  },
  filterButton: {
    flex: 1,
    backgroundColor: colors.neutral.white,
    borderWidth: 3,
    borderColor: colors.primary.black,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primary.orange,
  },
  filterText: {
    fontSize: typography.sizes.xs,
    fontWeight: '800',
    color: colors.primary.black,
  },
  filterTextActive: {
    color: colors.neutral.white,
  },
  statsHeader: {
    backgroundColor: colors.primary.black,
    padding: spacing.sm,
  },
  statsText: {
    fontSize: typography.sizes.sm,
    fontWeight: '800',
    color: colors.neutral.white,
    textAlign: 'center',
  },
  listContent: {
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.neutral.white,
    borderWidth: 4,
    borderColor: colors.primary.black,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.primary.black,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  orderNumber: {
    fontSize: typography.sizes.lg,
    fontWeight: '800',
    color: colors.primary.black,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  customerInfo: {
    marginBottom: spacing.sm,
  },
  customerName: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.primary.black,
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.neutral.gray,
  },
  orderDetails: {
    backgroundColor: colors.neutral.ivory,
    borderWidth: 3,
    borderColor: colors.primary.black,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.neutral.gray,
  },
  detailValue: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.primary.black,
  },
  paymentBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  paymentText: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    color: colors.neutral.gray,
  },
  deliveryText: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.primary.orange,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: typography.sizes.lg,
    fontWeight: '800',
    color: colors.primary.black,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.neutral.gray,
    textAlign: 'center',
  },
});
