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
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Customer } from '@fashion-retail/shared';
import { colors, spacing, typography } from '@fashion-retail/design-system';

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

  const renderCustomerCard = ({ item }: { item: Customer }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/customers/${item.id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{item.name || 'Unknown'}</Text>
          <Text style={styles.customerPhone}>{item.phone}</Text>
        </View>
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagContainer}>
            <View style={styles.tag}>
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
          <Text style={styles.statLabel}>ORDERS</Text>
          <Text style={styles.statValue}>{item.total_orders || 0}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>SPENT</Text>
          <Text style={styles.statValue}>
            {formatCurrency(item.total_spent || 0)}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>LAST ORDER</Text>
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
  );

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
        <ActivityIndicator size="large" color={colors.primary.orange} />
      </View>
    );
  }

  const allTags = getAllTags();

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or phone..."
          placeholderTextColor={colors.neutral.gray}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {allTags.length > 0 && (
        <View style={styles.tagsFilterContainer}>
          <Text style={styles.filterLabel}>FILTER BY TAG:</Text>
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
        <Text style={styles.statsHeaderText}>
          {filteredCustomers.length} CUSTOMER
          {filteredCustomers.length !== 1 ? 'S' : ''}
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
            tintColor={colors.primary.orange}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery || selectedTag
                ? 'No customers match your filters'
                : 'No customers yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || selectedTag
                ? 'Try adjusting your search or filters'
                : 'Customers will appear here when they message you on WhatsApp'}
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
  searchContainer: {
    padding: spacing.md,
    backgroundColor: colors.neutral.ivory,
    borderBottomWidth: 4,
    borderBottomColor: colors.primary.black,
  },
  searchInput: {
    backgroundColor: colors.neutral.white,
    borderWidth: 3,
    borderColor: colors.primary.black,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.md,
    fontWeight: '600',
  },
  tagsFilterContainer: {
    backgroundColor: colors.neutral.ivory,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 4,
    borderBottomColor: colors.primary.black,
  },
  filterLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: '800',
    color: colors.primary.black,
    marginBottom: spacing.xs,
  },
  tagsFilterList: {
    paddingVertical: spacing.xs,
  },
  filterTag: {
    backgroundColor: colors.neutral.white,
    borderWidth: 3,
    borderColor: colors.primary.black,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
  },
  filterTagActive: {
    backgroundColor: colors.primary.orange,
  },
  filterTagText: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.primary.black,
  },
  filterTagTextActive: {
    color: colors.neutral.white,
  },
  statsHeader: {
    backgroundColor: colors.primary.black,
    padding: spacing.sm,
  },
  statsHeaderText: {
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
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: typography.sizes.lg,
    fontWeight: '800',
    color: colors.primary.black,
    marginBottom: spacing.xs,
  },
  customerPhone: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.neutral.gray,
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tag: {
    backgroundColor: colors.primary.orange,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginLeft: spacing.xs,
  },
  tagText: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  moreTagsText: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.neutral.gray,
    marginLeft: spacing.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.ivory,
    borderWidth: 3,
    borderColor: colors.primary.black,
    padding: spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 3,
    backgroundColor: colors.primary.black,
    marginHorizontal: spacing.xs,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: '800',
    color: colors.neutral.gray,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.primary.black,
  },
  notesContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.neutral.ivory,
    borderWidth: 2,
    borderColor: colors.primary.black,
    borderStyle: 'dashed',
  },
  notesText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.neutral.gray,
    fontStyle: 'italic',
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
