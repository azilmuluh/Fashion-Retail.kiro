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
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  Button,
  Input,
  Card,
  Heading2,
  BodyText,
  Label,
  colors,
  spacing,
  borderRadius,
} from '@fashion-retail/design-system';
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
        <Card variant="brutal" style={styles.card}>
          <Heading2 style={styles.title}>ADD NEW PRODUCT</Heading2>

          {/* Images */}
          <View style={styles.section}>
            <Label>PRODUCT IMAGES</Label>
            <BodyText style={styles.helperText}>
              Add up to 5 images (first will be primary)
            </BodyText>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.imagesContainer}>
                {images.map((uri, index) => (
                  <View key={index} style={styles.imageWrapper}>
                    <Image source={{ uri }} style={styles.image} />
                    <TouchableOpacity
                      onPress={() => removeImage(index)}
                      style={styles.removeButton}
                    >
                      <BodyText style={styles.removeButtonText}>✕</BodyText>
                    </TouchableOpacity>
                  </View>
                ))}
                
                {images.length < 5 && (
                  <TouchableOpacity onPress={pickImage} style={styles.addImageButton}>
                    <BodyText style={styles.addImageText}>+ Add Image</BodyText>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>

          {/* Basic Information */}
          <Input
            label="PRODUCT NAME"
            placeholder="Red Summer Dress"
            value={formData.name}
            onChangeText={(text) => updateField('name', text)}
            error={errors.name}
          />

          <Input
            label="DESCRIPTION"
            placeholder="Beautiful red summer dress perfect for..."
            value={formData.description}
            onChangeText={(text) => updateField('description', text)}
            multiline
            numberOfLines={3}
          />

          {/* Category Selection */}
          <View style={styles.section}>
            <Label>CATEGORY</Label>
            {errors.category && (
              <BodyText style={styles.errorText}>{errors.category}</BodyText>
            )}
            <View style={styles.categoryGrid}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => updateField('category', cat)}
                  style={[
                    styles.categoryOption,
                    formData.category === cat && styles.categoryOptionActive,
                  ]}
                >
                  <BodyText
                    style={[
                      styles.categoryText,
                      formData.category === cat && styles.categoryTextActive,
                    ]}
                  >
                    {cat.toUpperCase()}
                  </BodyText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Pricing */}
          <Input
            label="PRICE"
            placeholder="25000"
            value={formData.price}
            onChangeText={(text) => updateField('price', text)}
            keyboardType="numeric"
            error={errors.price}
            helperText={`Currency: ${retailer?.currency || 'XAF'}`}
          />

          {/* Inventory */}
          <Input
            label="STOCK QUANTITY"
            placeholder="50"
            value={formData.stockQuantity}
            onChangeText={(text) => updateField('stockQuantity', text)}
            keyboardType="numeric"
            error={errors.stockQuantity}
          />

          <Input
            label="LOW STOCK THRESHOLD"
            placeholder="10"
            value={formData.lowStockThreshold}
            onChangeText={(text) => updateField('lowStockThreshold', text)}
            keyboardType="numeric"
            error={errors.lowStockThreshold}
            helperText="Alert when stock falls below this number"
          />

          {/* Optional Fields */}
          <Input
            label="SKU (OPTIONAL)"
            placeholder="DRESS-RED-001"
            value={formData.sku}
            onChangeText={(text) => updateField('sku', text)}
            autoCapitalize="characters"
          />

          <Input
            label="SIZES (OPTIONAL)"
            placeholder="S, M, L, XL"
            value={formData.sizes}
            onChangeText={(text) => updateField('sizes', text)}
            helperText="Separate with commas"
          />

          <Input
            label="COLORS (OPTIONAL)"
            placeholder="Red, Blue, Green"
            value={formData.colors}
            onChangeText={(text) => updateField('colors', text)}
            helperText="Separate with commas"
          />

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              variant="outline"
              onPress={() => router.back()}
              style={styles.actionButton}
            >
              CANCEL
            </Button>
            <Button
              variant="primary"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              style={styles.actionButton}
            >
              ADD PRODUCT
            </Button>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  scrollContent: {
    padding: spacing[6],
  },
  card: {
    gap: spacing[4],
  },
  title: {
    marginBottom: spacing[2],
  },
  section: {
    marginBottom: spacing[4],
  },
  helperText: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: spacing[1],
  },
  imagesContainer: {
    flexDirection: 'row',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.black,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.status.error,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.black,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
  },
  addImageText: {
    color: colors.text.muted,
    fontSize: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  categoryOption: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.base,
    borderWidth: 2,
    borderColor: colors.black,
    backgroundColor: colors.white,
  },
  categoryOptionActive: {
    backgroundColor: colors.safetyOrange,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.black,
  },
  categoryTextActive: {
    color: colors.white,
  },
  errorText: {
    color: colors.status.error,
    fontSize: 12,
    marginTop: spacing[1],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  actionButton: {
    flex: 1,
  },
});
