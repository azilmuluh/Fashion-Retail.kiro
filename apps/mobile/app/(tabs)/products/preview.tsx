/**
 * Preview AI-Generated Products Screen
 * Review and edit AI-analyzed products before publishing to catalog
 */

import { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Text,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  Save, 
  X, 
  Edit3, 
  CheckCircle, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { colors, spacing } from '@fashion-retail/design-system';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { PRODUCT_CATEGORIES } from '@fashion-retail/shared';

interface AnalyzedProduct {
  imageUrl: string;
  name: string;
  description: string;
  category: string;
  suggestedPrice: number;
  colors: string[];
  sizes: string[];
  occasion: string;
  style: string;
  material: string;
  confidence: number;
  status: 'pending' | 'analyzing' | 'success' | 'error';
  error?: string;
}

interface EditableProduct extends AnalyzedProduct {
  id: string;
  expanded: boolean;
  selected: boolean;
}

export default function PreviewProductsScreen() {
  const router = useRouter();
  const { retailer } = useAuth();
  const params = useLocalSearchParams();
  
  const [products, setProducts] = useState<EditableProduct[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (params.products) {
      try {
        const parsed = JSON.parse(params.products as string) as AnalyzedProduct[];
        const withIds = parsed
          .filter(p => p.status === 'success')
          .map((p, i) => ({
            ...p,
            id: `product-${i}`,
            expanded: false,
            selected: true,
          }));
        setProducts(withIds);
      } catch (error) {
        console.error('Error parsing products:', error);
        Alert.alert('Error', 'Failed to load products');
        router.back();
      }
    }
  }, [params.products]);

  function toggleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id);
  }

  function toggleSelect(id: string) {
    setProducts(products.map(p => 
      p.id === id ? { ...p, selected: !p.selected } : p
    ));
  }

  function updateProduct(id: string, field: string, value: any) {
    setProducts(products.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    ));
  }

  function removeProduct(id: string) {
    setProducts(products.filter(p => p.id !== id));
  }

  async function publishProducts() {
    const selectedProducts = products.filter(p => p.selected);
    
    if (selectedProducts.length === 0) {
      Alert.alert('No Products Selected', 'Please select at least one product to publish');
      return;
    }

    setPublishing(true);

    try {
      const productsToInsert = selectedProducts.map(p => ({
        retailer_id: retailer?.id,
        name: p.name,
        description: p.description,
        category: p.category,
        price: p.suggestedPrice,
        currency: retailer?.currency || 'XAF',
        stock_quantity: 0, // User needs to add stock separately
        low_stock_threshold: 5,
        images: [p.imageUrl],
        colors: p.colors,
        sizes: p.sizes,
        metadata: {
          occasion: p.occasion,
          style: p.style,
          material: p.material,
          ai_confidence: p.confidence,
          ai_generated: true,
        },
        is_active: true,
      }));

      const { error } = await supabase
        .from('products')
        .insert(productsToInsert);

      if (error) throw error;

      Alert.alert(
        'Success! 🎉',
        `${selectedProducts.length} product${selectedProducts.length > 1 ? 's' : ''} published to your catalog`,
        [
          {
            text: 'View Products',
            onPress: () => router.replace('/products'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error publishing products:', error);
      Alert.alert('Error', error.message || 'Failed to publish products');
    } finally {
      setPublishing(false);
    }
  }

  const selectedCount = products.filter(p => p.selected).length;

  if (products.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <AlertTriangle size={48} color={colors.status.warning} />
        <Text style={styles.emptyText}>No products to preview</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Review Products</Text>
          <Text style={styles.headerSubtitle}>
            {selectedCount} of {products.length} selected
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.publishButton, publishing && styles.publishButtonDisabled]}
          onPress={publishProducts}
          disabled={publishing || selectedCount === 0}
        >
          {publishing ? (
            <ActivityIndicator size="small" color={colors.neutral.white} />
          ) : (
            <>
              <Save size={20} color={colors.neutral.white} />
              <Text style={styles.publishButtonText}>
                Publish ({selectedCount})
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Products List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {products.map((product) => (
          <View key={product.id} style={styles.productCard}>
            {/* Product Header */}
            <View style={styles.productHeader}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => toggleSelect(product.id)}
              >
                {product.selected && (
                  <CheckCircle size={24} color={colors.primary.green} />
                )}
                {!product.selected && (
                  <View style={styles.checkboxEmpty} />
                )}
              </TouchableOpacity>

              <Image source={{ uri: product.imageUrl }} style={styles.thumbnail} />

              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>
                  {product.name}
                </Text>
                <Text style={styles.productPrice}>
                  XAF {product.suggestedPrice.toLocaleString()}
                </Text>
                <View style={styles.confidenceBadge}>
                  <Text style={styles.confidenceText}>
                    {product.confidence}% confidence
                  </Text>
                </View>
              </View>

              <View style={styles.productActions}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => toggleExpand(product.id)}
                >
                  {expandedId === product.id ? (
                    <ChevronUp size={20} color={colors.text.primary} />
                  ) : (
                    <ChevronDown size={20} color={colors.text.primary} />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => removeProduct(product.id)}
                >
                  <X size={20} color={colors.status.error} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Expanded Details */}
            {expandedId === product.id && (
              <View style={styles.expandedContent}>
                {/* Name */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Product Name</Text>
                  <TextInput
                    style={styles.input}
                    value={product.name}
                    onChangeText={(text) => updateProduct(product.id, 'name', text)}
                    placeholder="Product name"
                  />
                </View>

                {/* Description */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={product.description}
                    onChangeText={(text) => updateProduct(product.id, 'description', text)}
                    placeholder="Product description"
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {/* Category */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Category</Text>
                  <View style={styles.categoryPicker}>
                    {Object.values(PRODUCT_CATEGORIES).map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryOption,
                          product.category === cat && styles.categoryOptionActive,
                        ]}
                        onPress={() => updateProduct(product.id, 'category', cat)}
                      >
                        <Text
                          style={[
                            styles.categoryText,
                            product.category === cat && styles.categoryTextActive,
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Price */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Price (XAF)</Text>
                  <TextInput
                    style={styles.input}
                    value={String(product.suggestedPrice)}
                    onChangeText={(text) => {
                      const price = parseFloat(text) || 0;
                      updateProduct(product.id, 'suggestedPrice', price);
                    }}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>

                {/* Colors */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Colors (comma separated)</Text>
                  <TextInput
                    style={styles.input}
                    value={product.colors.join(', ')}
                    onChangeText={(text) => {
                      const colors = text.split(',').map(c => c.trim()).filter(Boolean);
                      updateProduct(product.id, 'colors', colors);
                    }}
                    placeholder="Red, Blue, Green"
                  />
                </View>

                {/* Sizes */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Sizes (comma separated)</Text>
                  <TextInput
                    style={styles.input}
                    value={product.sizes.join(', ')}
                    onChangeText={(text) => {
                      const sizes = text.split(',').map(s => s.trim()).filter(Boolean);
                      updateProduct(product.id, 'sizes', sizes);
                    }}
                    placeholder="S, M, L, XL"
                  />
                </View>

                {/* Additional Info */}
                <View style={styles.additionalInfo}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Style:</Text>
                    <Text style={styles.infoValue}>{product.style}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Occasion:</Text>
                    <Text style={styles.infoValue}>{product.occasion}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Material:</Text>
                    <Text style={styles.infoValue}>{product.material}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        ))}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.cream,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: colors.primary.cream,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  backButton: {
    backgroundColor: colors.primary.green,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 50,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  header: {
    backgroundColor: colors.neutral.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  publishButton: {
    backgroundColor: colors.primary.green,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 50,
    shadowColor: 'rgba(46, 204, 113, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  publishButtonDisabled: {
    opacity: 0.5,
  },
  publishButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  productCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.primary,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  checkbox: {
    width: 28,
    height: 28,
  },
  checkboxEmpty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border.primary,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  productInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary.green,
    marginBottom: spacing.xs,
  },
  confidenceBadge: {
    backgroundColor: colors.accent.light,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary.green,
  },
  productActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedContent: {
    padding: spacing.lg,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  field: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.primary.cream,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: 8,
    padding: spacing.sm,
    fontSize: 14,
    color: colors.text.primary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  categoryOption: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: colors.border.primary,
    backgroundColor: colors.neutral.white,
  },
  categoryOptionActive: {
    backgroundColor: colors.primary.green,
    borderColor: colors.primary.green,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
  },
  categoryTextActive: {
    color: colors.neutral.white,
  },
  additionalInfo: {
    backgroundColor: colors.primary.cream,
    borderRadius: 8,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.secondary,
    width: 80,
  },
  infoValue: {
    fontSize: 12,
    color: colors.text.primary,
    flex: 1,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
});
