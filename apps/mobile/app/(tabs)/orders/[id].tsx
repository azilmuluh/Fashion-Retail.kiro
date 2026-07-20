import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Order } from '@fashion-retail/shared';
import { colors, spacing, typography } from '@fashion-retail/design-system';

interface OrderWithDetails extends Order {
  customer?: {
    name: string;
    phone_number: string;
    email?: string;
  };
  order_items?: Array<{
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    selected_size?: string;
    selected_color?: string;
    product?: {
      name: string;
      category: string;
    };
  }>;
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers (name, phone_number, email),
          order_items (
            id,
            product_id,
            quantity,
            unit_price,
            total_price,
            selected_size,
            selected_color,
            product:products (name, category)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
      Alert.alert('Error', 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus: string) => {
    if (!order) return;

    Alert.alert(
      'Update Status',
      `Change order status to "${newStatus}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setUpdating(true);
            try {
              const { error } = await supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('id', order.id);

              if (error) throw error;

              Alert.alert('Success', `Order status updated to ${newStatus}`);
              fetchOrder();
            } catch (error) {
              console.error('Error updating order:', error);
              Alert.alert('Error', 'Failed to update order status');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const updatePaymentStatus = async (newStatus: string) => {
    if (!order) return;

    Alert.alert(
      'Update Payment',
      `Mark payment as "${newStatus}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setUpdating(true);
            try {
              const { error } = await supabase
                .from('orders')
                .update({ payment_status: newStatus })
                .eq('id', order.id);

              if (error) throw error;

              Alert.alert('Success', `Payment status updated to ${newStatus}`);
              fetchOrder();
            } catch (error) {
              console.error('Error updating payment:', error);
              Alert.alert('Error', 'Failed to update payment status');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} XAF`;
  };

  const renderOrderItem = ({ item }: { item: any }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{item.product?.name || 'Unknown Product'}</Text>
        <Text style={styles.itemTotal}>{formatCurrency(item.total_price)}</Text>
      </View>
      <View style={styles.itemDetails}>
        <Text style={styles.itemDetail}>
          {item.quantity} x {formatCurrency(item.unit_price)}
        </Text>
        {item.selected_size && (
          <Text style={styles.itemDetail}>Size: {item.selected_size}</Text>
        )}
        {item.selected_color && (
          <Text style={styles.itemDetail}>Color: {item.selected_color}</Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary.orange} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Order not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Order Header */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>ORDER INFORMATION</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Order Number:</Text>
          <Text style={styles.infoValue}>#{order.id.substring(0, 8).toUpperCase()}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Date:</Text>
          <Text style={styles.infoValue}>{formatDate(order.created_at)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Status:</Text>
          <Text style={[styles.infoValue, styles.statusValue]}>{order.status.toUpperCase()}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Payment:</Text>
          <Text style={[styles.infoValue, styles.statusValue]}>
            {order.payment_status.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Customer Info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>CUSTOMER</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name:</Text>
          <Text style={styles.infoValue}>{order.customer?.name || 'Unknown'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone:</Text>
          <Text style={styles.infoValue}>{order.customer?.phone_number}</Text>
        </View>
        {order.customer?.email && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{order.customer.email}</Text>
          </View>
        )}
      </View>

      {/* Order Items */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>ORDER ITEMS</Text>
        <FlatList
          data={order.order_items}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.itemsList}
        />
      </View>

      {/* Delivery Info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>DELIVERY</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Method:</Text>
          <Text style={styles.infoValue}>
            {order.delivery_method === 'pickup' ? 'PICKUP' : 'DELIVERY'}
          </Text>
        </View>
        {order.delivery_address && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Address:</Text>
            <Text style={styles.infoValue}>{order.delivery_address}</Text>
          </View>
        )}
        {order.notes && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Notes:</Text>
            <Text style={styles.infoValue}>{order.notes}</Text>
          </View>
        )}
      </View>

      {/* Totals */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>TOTALS</Text>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL AMOUNT:</Text>
          <Text style={styles.totalValue}>{formatCurrency(order.total_amount)}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>ACTIONS</Text>

        <Text style={styles.actionSectionLabel}>Update Order Status:</Text>
        <View style={styles.actionButtons}>
          {order.status === 'pending' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={() => updateOrderStatus('confirmed')}
              disabled={updating}
            >
              <Text style={styles.actionButtonText}>✅ CONFIRM</Text>
            </TouchableOpacity>
          )}
          {order.status === 'confirmed' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.processButton]}
              onPress={() => updateOrderStatus('processing')}
              disabled={updating}
            >
              <Text style={styles.actionButtonText}>📦 PROCESS</Text>
            </TouchableOpacity>
          )}
          {order.status === 'processing' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.fulfillButton]}
              onPress={() => updateOrderStatus('fulfilled')}
              disabled={updating}
            >
              <Text style={styles.actionButtonText}>🚚 FULFILL</Text>
            </TouchableOpacity>
          )}
          {order.status === 'fulfilled' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deliverButton]}
              onPress={() => updateOrderStatus('delivered')}
              disabled={updating}
            >
              <Text style={styles.actionButtonText}>✨ DELIVERED</Text>
            </TouchableOpacity>
          )}
          {order.status !== 'cancelled' && order.status !== 'delivered' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => updateOrderStatus('cancelled')}
              disabled={updating}
            >
              <Text style={styles.actionButtonText}>❌ CANCEL</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.actionSectionLabel, { marginTop: spacing.md }]}>
          Update Payment:
        </Text>
        <View style={styles.actionButtons}>
          {order.payment_status === 'pending' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.paidButton]}
              onPress={() => updatePaymentStatus('paid')}
              disabled={updating}
            >
              <Text style={styles.actionButtonText}>💳 MARK PAID</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
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
  errorText: {
    fontSize: typography.sizes.lg,
    fontWeight: '800',
    color: colors.primary.black,
  },
  card: {
    backgroundColor: colors.neutral.white,
    borderWidth: 4,
    borderColor: colors.primary.black,
    margin: spacing.md,
    padding: spacing.md,
    shadowColor: colors.primary.black,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '800',
    color: colors.primary.black,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 3,
    borderBottomColor: colors.primary.black,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  infoLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.neutral.gray,
  },
  infoValue: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.primary.black,
    flex: 1,
    textAlign: 'right',
  },
  statusValue: {
    color: colors.primary.orange,
  },
  itemsList: {
    gap: spacing.sm,
  },
  itemCard: {
    backgroundColor: colors.neutral.ivory,
    borderWidth: 3,
    borderColor: colors.primary.black,
    padding: spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  itemName: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.primary.black,
    flex: 1,
  },
  itemTotal: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.primary.orange,
  },
  itemDetails: {
    gap: 2,
  },
  itemDetail: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    color: colors.neutral.gray,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral.ivory,
    borderWidth: 3,
    borderColor: colors.primary.black,
    padding: spacing.sm,
  },
  totalLabel: {
    fontSize: typography.sizes.md,
    fontWeight: '800',
    color: colors.primary.black,
  },
  totalValue: {
    fontSize: typography.sizes.md,
    fontWeight: '800',
    color: colors.primary.orange,
  },
  actionSectionLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.neutral.gray,
    marginBottom: spacing.sm,
  },
  actionButtons: {
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.md,
    borderWidth: 3,
    borderColor: colors.primary.black,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  processButton: {
    backgroundColor: colors.primary.orange,
  },
  fulfillButton: {
    backgroundColor: '#2196F3',
  },
  deliverButton: {
    backgroundColor: '#9C27B0',
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },
  paidButton: {
    backgroundColor: '#66BB6A',
  },
  actionButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: '800',
    color: colors.neutral.white,
  },
});
