import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Users, Phone, Tag, ShoppingBag, DollarSign, Calendar } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Customer } from '@fashion-retail/shared';
import { colors, spacing } from '@fashion-retail/design-system';

export default function CustomersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
    subscribeToCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [searchQuery, selectedTag, customers]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const subscribeToCustomers = () => {
    const subscription = supabase
      .channel('customers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers',
        },
        () => {
          fetchCustomers();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const filterCustomers = () => {
    let filtered = customers;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (customer) =>
          customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.phone.includes(searchQuery) ||
          customer.whatsapp_number?.includes(searchQuery)
      );
    }

    // Filter by tag
    if (selectedTag) {
      filtered = filtered.filter((customer) =>
        customer.tags?.includes(selectedTag)
      );
    }

    setFilteredCustomers(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCustomers();
  };

  const getAllTags = () => {
    const tagsSet = new Set<string>();
    customers.forEach((customer) => {
      customer.tags?.forEach((tag) => tagsSet.add(tag));
    });
    return Array.from(tagsSet);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} XAF`;
  };

  const renderCustomerCard = ({ item, index }: { item: Customer; index: number }) => {
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
          onPress={() => router.push(`/customers/${item.id}`)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{item.name || 'Unknown'}</Text>
              <View style={styles.phoneRow}>
                <Phone size={14} color={colors.text.secondary} />
                <Text style={styles.customerPhone}>{item.phone}</Text>
              </View>
            </View>
            {item.tags && item.tags.length > 0 && (
              <View style={styles.tagContainer}>
                <View style={styles.tag}>
                  <Tag size={10} color={colors.neutral.white} />
                  <Text style={styles.tagText}>{item.tags[0]}</Text>
                </View>
                {item.tags.length > 1 && (
                  <Text style={styles.moreTagsText}>+{item.tags.length - 1}</Text>
                )}
              </View>
            )}
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <ShoppingBag size={16} color={colors.primary.green} />
              <Text style={styles.statLabel}>Orders</Text>
              <Text style={styles.statValue}>{item.total_orders || 0}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <DollarSign size={16} color={colors.primary.green} />
              <Text style={styles.statLabel}>Spent</Text>
              <Text style={styles.statValue}>
                {formatCurrency(item.total_spent || 0)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Calendar size={16} color={colors.primary.green} />
              <Text style={styles.statLabel}>Last Order</Text>
              <Text style={styles.statValue}>
                {item.last_order_date ? formatDate(item.last_order_date) : 'Never'}
              </Text>
            </View>
          </View>

          {item.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesText} numberOfLines={2}>
                {item.notes}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderTagFilter = (tag: string) => (
    <TouchableOpacity
      key={tag}
      style={[styles.filterTag, selectedTag === tag && styles.filterTagActive]}
      onPress={() => setSelectedTag(selectedTag === tag ? null : tag)}
    >
      <Text
        style={[
          styles.filterTagText,
          selectedTag === tag && styles.filterTagTextActive,
        ]}
      >
        {tag}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary.green} />
        <Text style={styles.loadingText}>Loading customers...</Text>
      </View>
    );
  }

  const allTags = getAllTags();

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={20} color={colors.text.secondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or phone..."
            placeholderTextColor={colors.text.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {allTags.length > 0 && (
        <View style={styles.tagsFilterContainer}>
          <Text style={styles.filterLabel}>Filter by tag:</Text>
          <FlatList
            horizontal
            data={allTags}
            renderItem={({ item }) => renderTagFilter(item)}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagsFilterList}
          />
        </View>
      )}

      <View style={styles.statsHeader}>
        <Users size={16} color={colors.neutral.white} />
        <Text style={styles.statsHeaderText}>
          {filteredCustomers.length} Customer{filteredCustomers.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomerCard}
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
            <Users size={64} color={colors.border.primary} />
            <Text style={styles.emptyText}>
              {searchQuery || selectedTag
                ? 'No customers match your filters'
                : 'No customers yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || selectedTag
                ? 'Try adjusting your search or filters'
                : 'Customers will appear here when they place orders'}
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
  searchContainer: {
    padding: spacing.lg,
    backgroundColor: colors.primary.cream,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  tagsFilterContainer: {
    backgroundColor: colors.primary.cream,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagsFilterList: {
    paddingVertical: spacing.xs,
  },
  filterTag: {
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.border.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: 50,
    marginRight: spacing.sm,
  },
  filterTagActive: {
    backgroundColor: colors.primary.green,
    borderColor: colors.primary.green,
  },
  filterTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  filterTagTextActive: {
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
  statsHeaderText: {
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
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  customerPhone: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tag: {
    backgroundColor: colors.accent.light,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 50,
    marginLeft: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary.green,
  },
  moreTagsText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.primary.cream,
    borderRadius: 12,
    padding: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border.primary,
    marginHorizontal: spacing.sm,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  notesContainer: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.accent.light,
    borderRadius: 8,
  },
  notesText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
    lineHeight: 18,
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
