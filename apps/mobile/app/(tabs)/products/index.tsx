/**
 * Products List Screen
 * Grid layout with search, filter, and real-time updates
 */

import { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  Animated,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Package, Plus, AlertCircle, Tag } from 'lucide-react-native';
// Temporarily disabled scanner due to import issues
// import { ScanLine } from 'lucide-react-native';
import { colors, spacing } from '@fashion-retail/design-system';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Product, PRODUCT_CATEGORIES, formatCurrency } from '@fashion-retail/shared';
// import ImageScanner from '../../../components/ImageScanner';

export default function ProductsListScreen() {
  const router = useRouter();
  const { retailer } = useAuth();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  // const [scannerVisible, setScannerVisible] = useState(false);

  useEffect(() => {
    loadProducts();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `retailer_id=eq.${retailer?.id}`,
        },
        () => {
          loadProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [retailer?.id]);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery, selectedCategory]);

  async function loadProducts() {
    if (!retailer?.id) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('retailer_id', retailer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function filterProducts() {
    let filtered = products;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    setFilteredProducts(filtered);
  }

  function handleRefresh() {
    setRefreshing(true);
    loadProducts();
  }

  function handleProductsDetected(products: any[]) {
    console.log('Detected products:', products);
    Alert.alert(
      'Products Detected',
      `${products.length} product(s) detected! You can now add them to your inventory.`,
      [
        {
          text: 'Add Later',
          style: 'cancel',
        },
        {
          text: 'Add Now',
          onPress: () => {
            // Navigate to add product page with detected products
            router.push('/(tabs)/products/add');
          },
        },
      ]
    );
  }

  function getStockStatus(product: Product): {
    label: string;
    color: string;
    bgColor: string;
  } {
    if (product.stock_quantity === 0) {
      return { 
        label: 'Out of Stock', 
        color: colors.neutral.white,
        bgColor: colors.status.error,
      };
    }
    if (product.stock_quantity <= product.low_stock_threshold) {
      return { 
        label: 'Low Stock', 
        color: colors.neutral.white,
        bgColor: colors.status.warning,
      };
    }
    return { 
      label: 'In Stock', 
      color: colors.neutral.white,
      bgColor: colors.status.success,
    };
  }

  const categories = Object.values(PRODUCT_CATEGORIES);

  return (
    <View style={styles.container}>
      {/* Search and Filter */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Search size={20} color={colors.text.secondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.text.secondary}
            />
          </View>

          {/* Scan Button - Temporarily disabled */}
          {/* <TouchableOpacity
            style={styles.scanButton}
            onPress={() => setScannerVisible(true)}
          >
            <ScanLine size={24} color={colors.primary.green} />
          </TouchableOpacity> */}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContainer}
        >
          <TouchableOpacity
            onPress={() => setSelectedCategory(null)}
            style={[
              styles.categoryChip,
              !selectedCategory && styles.categoryChipActive,
            ]}
          >
            <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>
              All
            </Text>
          </TouchableOpacity>

          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              onPress={() => setSelectedCategory(category)}
              style={[
                styles.categoryChip,
                selectedCategory === category && styles.categoryChipActive,
              ]}
            >
              <Text style={[
                styles.categoryChipText,
                selectedCategory === category && styles.categoryChipTextActive
              ]}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Products Count Header */}
      <View style={styles.countHeader}>
        <Package size={16} color={colors.neutral.white} />
        <Text style={styles.countText}>
          {filteredProducts.length} Product{filteredProducts.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Products Grid */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            tintColor={colors.primary.green}
          />
        }
      >
        {loading ? (
          <View style={styles.empty}>
            <Package size={48} color={colors.border.primary} />
            <Text style={styles.emptyText}>Loading products...</Text>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={styles.empty}>
            <Package size={64} color={colors.border.primary} />
            <Text style={styles.emptyText}>
              {searchQuery || selectedCategory
                ? 'No products found'
                : 'No products yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || selectedCategory
                ? 'Try adjusting your search or filters'
                : 'Add your first product to get started'}
            </Text>
            {!searchQuery && !selectedCategory && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/(tabs)/products/add')}
              >
                <Plus size={20} color={colors.neutral.white} />
                <Text style={styles.emptyButtonText}>Add Your First Product</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredProducts.map((product, index) => {
              const stockStatus = getStockStatus(product);
              const fadeAnim = new Animated.Value(0);
              
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                delay: index * 30,
                useNativeDriver: true,
              }).start();

              return (
                <Animated.View key={product.id} style={[styles.productCardWrapper, { opacity: fadeAnim }]}>
                  <TouchableOpacity
                    onPress={() => router.push(`/(tabs)/products/${product.id}`)}
                    style={styles.productCard}
                    activeOpacity={0.7}
                  >
                    {product.images && product.images.length > 0 ? (
                      <Image
                        source={{ uri: product.images[0] }}
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.placeholderImage}>
                        <Package size={32} color={colors.border.primary} />
                        <Text style={styles.placeholderText}>No Image</Text>
                      </View>
                    )}

                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={2}>
                        {product.name}
                      </Text>

                      <Text style={styles.productPrice}>
                        {formatCurrency(product.price, product.currency)}
                      </Text>

                      <View style={styles.productMeta}>
                        <View style={[styles.stockBadge, { backgroundColor: stockStatus.bgColor }]}>
                          <AlertCircle size={10} color={stockStatus.color} />
                          <Text style={[styles.stockBadgeText, { color: stockStatus.color }]}>
                            {stockStatus.label}
                          </Text>
                        </View>
                        <Text style={styles.stockQuantity}>
                          {product.stock_quantity} units
                        </Text>
                      </View>

                      {product.category && (
                        <View style={styles.categoryTag}>
                          <Tag size={10} color={colors.primary.green} />
                          <Text style={styles.categoryTagText}>
                            {product.category}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Floating Add Button with Options */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fabOption, styles.fabBulk]}
          onPress={() => router.push('/(tabs)/products/bulk-upload')}
          activeOpacity={0.8}
        >
          <Text style={styles.fabOptionLabel}>AI Bulk Upload</Text>
          <View style={styles.fabOptionButton}>
            <Text style={styles.fabOptionEmoji}>✨</Text>
            <Text style={styles.fabOptionText}>Up to 50</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.fabOption, styles.fabManual]}
          onPress={() => router.push('/(tabs)/products/add')}
          activeOpacity={0.8}
        >
          <Text style={styles.fabOptionLabel}>Manual Entry</Text>
          <View style={styles.fabOptionButton}>
            <Plus size={20} color={colors.neutral.white} />
            <Text style={styles.fabOptionText}>Add One</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Image Scanner Modal - Temporarily disabled */}
      {/* <ImageScanner
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onProductsDetected={handleProductsDetected}
      /> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.cream,
  },
  header: {
    backgroundColor: colors.primary.cream,
    paddingBottom: spacing.md,
  },
  searchContainer: {
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent.light,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary.green,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  categoryScroll: {
    paddingHorizontal: spacing.lg,
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  categoryChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: colors.border.primary,
    backgroundColor: colors.neutral.white,
  },
  categoryChipActive: {
    backgroundColor: colors.primary.green,
    borderColor: colors.primary.green,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  categoryChipTextActive: {
    color: colors.neutral.white,
  },
  countHeader: {
    backgroundColor: colors.primary.green,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'] * 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  productCardWrapper: {
    width: '48%',
  },
  productCard: {
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 140,
    backgroundColor: colors.primary.beige,
  },
  placeholderImage: {
    width: '100%',
    height: 140,
    backgroundColor: colors.primary.beige,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  placeholderText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '500',
  },
  productInfo: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  productName: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.text.primary,
  },
  productPrice: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary.green,
  },
  productMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: 50,
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  stockQuantity: {
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    backgroundColor: colors.accent.light,
    borderRadius: 50,
    alignSelf: 'flex-start',
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary.green,
  },
  empty: {
    paddingVertical: spacing['2xl'] * 2,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtext: {
    textAlign: 'center',
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary.green,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    shadowColor: 'rgba(46, 204, 113, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyButtonText: {
    color: colors.neutral.white,
    fontSize: 15,
    fontWeight: '700',
  },
  fabContainer: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    gap: spacing.sm,
    alignItems: 'flex-end',
  },
  fabOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  fabBulk: {
    marginBottom: spacing.xs,
  },
  fabManual: {},
  fabOptionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.primary,
    backgroundColor: colors.neutral.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  fabOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary.green,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 50,
  },
  fabOptionEmoji: {
    fontSize: 20,
  },
  fabOptionText: {
    color: colors.neutral.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
