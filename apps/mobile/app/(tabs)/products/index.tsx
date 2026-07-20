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
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Button,
  Card,
  Badge,
  Heading3,
  BodyText,
  Label,
  colors,
  spacing,
  borderRadius,
} from '@fashion-retail/design-system';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Product, PRODUCT_CATEGORIES, formatCurrency } from '@fashion-retail/shared';

export default function ProductsListScreen() {
  const router = useRouter();
  const { retailer } = useAuth();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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

  function getStockStatus(product: Product): {
    label: string;
    variant: 'success' | 'warning' | 'error';
  } {
    if (product.stock_quantity === 0) {
      return { label: 'OUT OF STOCK', variant: 'error' };
    }
    if (product.stock_quantity <= product.low_stock_threshold) {
      return { label: 'LOW STOCK', variant: 'warning' };
    }
    return { label: 'IN STOCK', variant: 'success' };
  }

  const categories = Object.values(PRODUCT_CATEGORIES);

  return (
    <View style={styles.container}>
      {/* Search and Filter */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.text.muted}
          />
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
            <Label style={!selectedCategory && styles.categoryChipTextActive}>
              ALL
            </Label>
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
              <Label
                style={
                  selectedCategory === category && styles.categoryChipTextActive
                }
              >
                {category.toUpperCase()}
              </Label>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Products Grid */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <BodyText style={styles.emptyText}>Loading products...</BodyText>
        ) : filteredProducts.length === 0 ? (
          <View style={styles.empty}>
            <BodyText style={styles.emptyText}>
              {searchQuery || selectedCategory
                ? 'No products found'
                : 'No products yet'}
            </BodyText>
            {!searchQuery && !selectedCategory && (
              <Button
                variant="primary"
                onPress={() => router.push('/(tabs)/products/add')}
                style={styles.emptyButton}
              >
                ADD YOUR FIRST PRODUCT
              </Button>
            )}
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredProducts.map((product) => {
              const stockStatus = getStockStatus(product);
              return (
                <TouchableOpacity
                  key={product.id}
                  onPress={() => router.push(`/(tabs)/products/${product.id}`)}
                  style={styles.productCard}
                >
                  <Card variant="default" style={styles.card}>
                    {product.images && product.images.length > 0 ? (
                      <Image
                        source={{ uri: product.images[0] }}
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.placeholderImage}>
                        <BodyText style={styles.placeholderText}>
                          No Image
                        </BodyText>
                      </View>
                    )}

                    <View style={styles.productInfo}>
                      <Heading3 style={styles.productName} numberOfLines={2}>
                        {product.name}
                      </Heading3>

                      <BodyText style={styles.productPrice}>
                        {formatCurrency(product.price, product.currency)}
                      </BodyText>

                      <View style={styles.productMeta}>
                        <Badge variant={stockStatus.variant} size="small">
                          {stockStatus.label}
                        </Badge>
                        <BodyText style={styles.stockQuantity}>
                          {product.stock_quantity} units
                        </BodyText>
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Floating Add Button */}
      <View style={styles.fab}>
        <Button
          variant="primary"
          size="large"
          onPress={() => router.push('/(tabs)/products/add')}
        >
          + ADD PRODUCT
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  header: {
    backgroundColor: colors.white,
    borderBottomWidth: 2,
    borderBottomColor: colors.black,
    paddingBottom: spacing[4],
  },
  searchContainer: {
    padding: spacing[4],
  },
  searchInput: {
    backgroundColor: colors.ivory,
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: borderRadius.base,
    padding: spacing[4],
    fontSize: 16,
    fontFamily: 'Inter',
    color: colors.text.primary,
  },
  categoryScroll: {
    paddingHorizontal: spacing[4],
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingBottom: spacing[2],
  },
  categoryChip: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.black,
    backgroundColor: colors.white,
  },
  categoryChipActive: {
    backgroundColor: colors.safetyOrange,
  },
  categoryChipTextActive: {
    color: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing[4],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
  },
  productCard: {
    width: '48%',
  },
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 150,
    backgroundColor: colors.gray[200],
  },
  placeholderImage: {
    width: '100%',
    height: 150,
    backgroundColor: colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: colors.text.muted,
    fontSize: 12,
  },
  productInfo: {
    padding: spacing[4],
    gap: spacing[2],
  },
  productName: {
    fontSize: 16,
    lineHeight: 20,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.safetyOrange,
  },
  productMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockQuantity: {
    fontSize: 12,
    color: colors.text.muted,
  },
  empty: {
    paddingVertical: spacing[12],
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: colors.text.muted,
    marginBottom: spacing[4],
  },
  emptyButton: {
    marginTop: spacing[4],
  },
  fab: {
    position: 'absolute',
    bottom: spacing[6],
    left: spacing[6],
    right: spacing[6],
  },
});
