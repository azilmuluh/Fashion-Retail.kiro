/**
 * Add Product Screen
 * Form to create new products with image upload
 */

import { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Image,
  Text,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image as ImageIcon, X, Plus, Check } from 'lucide-react-native';
import { colors, spacing } from '@fashion-retail/design-system';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import {
  isValidPrice,
  isValidStockQuantity,
  isValidProductName,
  PRODUCT_CATEGORIES,
} from '@fashion-retail/shared';

export default function AddProductScreen() {
  const router = useRouter();
  const { retailer } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    stockQuantity: '',
    lowStockThreshold: '10',
    sku: '',
    sizes: '',
    colors: '',
  });

  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function updateField(field: string, value: string) {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  }

  async function pickImage() {
    if (images.length >= 5) {
      Alert.alert('Limit Reached', 'You can only upload up to 5 images');
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImages([...images, result.assets[0].uri]);
    }
  }

  function removeImage(index: number) {
    setImages(images.filter((_, i) => i !== index));
  }

  function validate() {
    const newErrors: Record<string, string> = {};

    if (!isValidProductName(formData.name)) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    const price = parseFloat(formData.price);
    if (!formData.price || isNaN(price) || !isValidPrice(price)) {
      newErrors.price = 'Valid price is required';
    }

    const stock = parseInt(formData.stockQuantity);
    if (!formData.stockQuantity || isNaN(stock) || !isValidStockQuantity(stock)) {
      newErrors.stockQuantity = 'Valid stock quantity is required';
    }

    const threshold = parseInt(formData.lowStockThreshold);
    if (isNaN(threshold) || threshold < 0) {
      newErrors.lowStockThreshold = 'Valid threshold is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate() || !retailer?.id) return;

    setLoading(true);

    try {
      // Parse arrays
      const sizes = formData.sizes
        ? formData.sizes.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      const colors = formData.colors
        ? formData.colors.split(',').map((c) => c.trim()).filter(Boolean)
        : [];

      // Create product
      const { error } = await supabase.from('products').insert({
        retailer_id: retailer.id,
        name: formData.name,
        description: formData.description || null,
        category: formData.category,
        price: parseFloat(formData.price),
        currency: retailer.currency,
        stock_quantity: parseInt(formData.stockQuantity),
        low_stock_threshold: parseInt(formData.lowStockThreshold),
        sku: formData.sku || null,
        images: images, // In production, upload to Supabase Storage
        sizes,
        colors,
        is_active: true,
      });

      if (error) throw error;

      Alert.alert('Success', 'Product added successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Error adding product:', error);
      Alert.alert('Error', error.message || 'Failed to add product');
    } finally {
      setLoading(false);
    }
  }

  const categories = Object.values(PRODUCT_CATEGORIES);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.title}>Add New Product</Text>

          {/* Images Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Product Images</Text>
            <Text style={styles.helperText}>
              Add up to 5 images (first will be primary)
            </Text>
            
            {images.length > 0 && (
              <ScrollView horizontal style={styles.imagesContainer} showsHorizontalScrollIndicator={false}>
                {images.map((uri, index) => (
                  <View key={index} style={styles.imageWrapper}>
                    <Image source={{ uri }} style={styles.image} />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeImage(index)}
                    >
                      <X size={14} color={colors.neutral.white} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
            
            {images.length < 5 && (
              <TouchableOpacity onPress={pickImage} style={styles.addImageButton}>
                <Plus size={24} color={colors.primary.green} />
                <Text style={styles.addImageText}>Add Image</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Product Name */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Product Name *</Text>
            <TextInput
              style={[styles.textInput, errors.name && styles.inputError]}
              value={formData.name}
              onChangeText={(text) => updateField('name', text)}
              placeholder="e.g., Blue Floral Midi Dress"
              placeholderTextColor={colors.text.secondary}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => updateField('description', text)}
              placeholder="Describe your product..."
              placeholderTextColor={colors.text.secondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Category *</Text>
            <View style={styles.categoryGrid}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryOption,
                    formData.category === category && styles.categoryOptionActive,
                  ]}
                  onPress={() => updateField('category', category)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      formData.category === category && styles.categoryTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
          </View>

          {/* Price */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Price (XAF) *</Text>
            <TextInput
              style={[styles.textInput, errors.price && styles.inputError]}
              value={formData.price}
              onChangeText={(text) => updateField('price', text)}
              placeholder="0"
              placeholderTextColor={colors.text.secondary}
              keyboardType="numeric"
            />
            {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
          </View>

          {/* Stock Quantity */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Stock Quantity *</Text>
            <TextInput
              style={[styles.textInput, errors.stockQuantity && styles.inputError]}
              value={formData.stockQuantity}
              onChangeText={(text) => updateField('stockQuantity', text)}
              placeholder="0"
              placeholderTextColor={colors.text.secondary}
              keyboardType="numeric"
            />
            {errors.stockQuantity && <Text style={styles.errorText}>{errors.stockQuantity}</Text>}
          </View>

          {/* Low Stock Threshold */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Low Stock Alert Threshold</Text>
            <TextInput
              style={styles.textInput}
              value={formData.lowStockThreshold}
              onChangeText={(text) => updateField('lowStockThreshold', text)}
              placeholder="10"
              placeholderTextColor={colors.text.secondary}
              keyboardType="numeric"
            />
            <Text style={styles.helperText}>
              Get notified when stock falls below this number
            </Text>
          </View>

          {/* SKU */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SKU (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={formData.sku}
              onChangeText={(text) => updateField('sku', text)}
              placeholder="e.g., BFD-001"
              placeholderTextColor={colors.text.secondary}
            />
          </View>

          {/* Sizes */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Available Sizes</Text>
            <TextInput
              style={styles.textInput}
              value={formData.sizes}
              onChangeText={(text) => updateField('sizes', text)}
              placeholder="e.g., S, M, L, XL"
              placeholderTextColor={colors.text.secondary}
            />
            <Text style={styles.helperText}>
              Separate with commas
            </Text>
          </View>

          {/* Colors */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Available Colors</Text>
            <TextInput
              style={styles.textInput}
              value={formData.colors}
              onChangeText={(text) => updateField('colors', text)}
              placeholder="e.g., Blue, Red, Green"
              placeholderTextColor={colors.text.secondary}
            />
            <Text style={styles.helperText}>
              Separate with commas
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButtonStyle, styles.cancelButton]}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButtonStyle, styles.submitButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Adding...' : 'Add Product'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.cream,
  },
  scrollContent: {
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  helperText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  imagesContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.status.error,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: colors.neutral.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  addImageButton: {
    width: '100%',
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary.beige,
    marginTop: spacing.sm,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  addImageText: {
    color: colors.primary.green,
    fontSize: 14,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text.primary,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.status.error,
    borderWidth: 2,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  categoryOption: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
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
  errorText: {
    color: colors.status.error,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
  actionButtonStyle: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  submitButton: {
    backgroundColor: colors.primary.green,
    shadowColor: 'rgba(46, 204, 113, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral.white,
  },
});
