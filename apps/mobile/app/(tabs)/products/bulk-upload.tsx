/**
 * AI Bulk Product Upload Screen
 * Upload up to 50 images and let AI analyze them to generate product catalog
 */

import { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Text,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Upload, X, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { colors, spacing } from '@fashion-retail/design-system';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

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

export default function BulkUploadScreen() {
  const router = useRouter();
  const { retailer } = useAuth();
  
  const [images, setImages] = useState<string[]>([]);
  const [analyzedProducts, setAnalyzedProducts] = useState<AnalyzedProduct[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalyzingIndex, setCurrentAnalyzingIndex] = useState(0);

  async function pickImages() {
    const remaining = 50 - images.length;
    
    if (remaining <= 0) {
      Alert.alert('Limit Reached', 'You can upload maximum 50 images at once');
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: remaining,
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map(asset => asset.uri);
      setImages([...images, ...newImages]);
    }
  }

  function removeImage(index: number) {
    setImages(images.filter((_, i) => i !== index));
    setAnalyzedProducts(analyzedProducts.filter((_, i) => i !== index));
  }

  async function analyzeProducts() {
    if (images.length === 0) {
      Alert.alert('No Images', 'Please add at least one product image');
      return;
    }

    setIsAnalyzing(true);
    
    // Initialize analyzed products array
    const initialProducts: AnalyzedProduct[] = images.map(imageUrl => ({
      imageUrl,
      name: '',
      description: '',
      category: '',
      suggestedPrice: 0,
      colors: [],
      sizes: [],
      occasion: '',
      style: '',
      material: '',
      confidence: 0,
      status: 'pending',
    }));
    
    setAnalyzedProducts(initialProducts);

    // Analyze images one by one
    for (let i = 0; i < images.length; i++) {
      setCurrentAnalyzingIndex(i);
      
      // Update status to analyzing
      setAnalyzedProducts(prev => 
        prev.map((p, idx) => 
          idx === i ? { ...p, status: 'analyzing' as const } : p
        )
      );

      try {
        // Upload image to Supabase Storage first
        const imageUrl = await uploadImageToStorage(images[i], i);
        
        // Call AI analysis function
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(
          `${supabase.supabaseUrl}/functions/v1/ai-catalog-generator`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session?.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ images: [imageUrl] }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to analyze image');
        }

        const result = await response.json();
        const analysis = result.products[0];

        // Update with analysis results
        setAnalyzedProducts(prev =>
          prev.map((p, idx) =>
            idx === i
              ? {
                  ...p,
                  ...analysis,
                  imageUrl,
                  status: 'success' as const,
                }
              : p
          )
        );
      } catch (error) {
        console.error(`Error analyzing image ${i}:`, error);
        
        setAnalyzedProducts(prev =>
          prev.map((p, idx) =>
            idx === i
              ? {
                  ...p,
                  status: 'error' as const,
                  error: error.message || 'Failed to analyze',
                }
              : p
          )
        );
      }
    }

    setIsAnalyzing(false);
    
    // Navigate to preview screen
    router.push({
      pathname: '/products/preview',
      params: { products: JSON.stringify(analyzedProducts) },
    });
  }

  async function uploadImageToStorage(uri: string, index: number): Promise<string> {
    // Get file extension
    const ext = uri.split('.').pop() || 'jpg';
    const fileName = `${retailer?.id}-${Date.now()}-${index}.${ext}`;
    
    // For web, fetch the blob
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, blob, {
          contentType: `image/${ext}`,
          upsert: false,
        });

      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path);
      
      return publicUrl;
    }
    
    // For mobile, use file system
    const formData = new FormData();
    formData.append('file', {
      uri,
      type: `image/${ext}`,
      name: fileName,
    } as any);

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, formData);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(data.path);

    return publicUrl;
  }

  const successCount = analyzedProducts.filter(p => p.status === 'success').length;
  const errorCount = analyzedProducts.filter(p => p.status === 'error').length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.titleContainer}>
            <Sparkles size={28} color={colors.primary.green} />
            <Text style={styles.title}>AI Bulk Upload</Text>
          </View>
          <Text style={styles.subtitle}>
            Upload up to 50 product images and let AI analyze them automatically
          </Text>
        </View>
      </View>

      {/* Upload Section */}
      {!isAnalyzing && images.length < 50 && (
        <TouchableOpacity style={styles.uploadButton} onPress={pickImages}>
          <Upload size={32} color={colors.primary.green} />
          <Text style={styles.uploadText}>
            {images.length === 0 ? 'Select Product Images' : 'Add More Images'}
          </Text>
          <Text style={styles.uploadHint}>
            {images.length}/50 images • Tap to select from gallery
          </Text>
        </TouchableOpacity>
      )}

      {/* Images Grid */}
      {images.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Selected Images ({images.length})
          </Text>
          
          <View style={styles.imagesGrid}>
            {images.map((uri, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.image} />
                
                {!isAnalyzing && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeImage(index)}
                  >
                    <X size={16} color={colors.neutral.white} />
                  </TouchableOpacity>
                )}

                {/* Analysis Status Badge */}
                {analyzedProducts[index] && (
                  <View style={styles.statusBadge}>
                    {analyzedProducts[index].status === 'analyzing' && (
                      <ActivityIndicator size="small" color={colors.neutral.white} />
                    )}
                    {analyzedProducts[index].status === 'success' && (
                      <CheckCircle2 size={16} color={colors.status.success} />
                    )}
                    {analyzedProducts[index].status === 'error' && (
                      <AlertCircle size={16} color={colors.status.error} />
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Analysis Progress */}
      {isAnalyzing && (
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Sparkles size={24} color={colors.primary.green} />
            <Text style={styles.progressTitle}>Analyzing Products...</Text>
          </View>
          
          <View style={styles.progressStats}>
            <Text style={styles.progressText}>
              {currentAnalyzingIndex + 1} of {images.length} images
            </Text>
            <Text style={styles.progressSubtext}>
              ✓ {successCount} successful • ✗ {errorCount} failed
            </Text>
          </View>

          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressBarFill,
                { width: `${((currentAnalyzingIndex + 1) / images.length) * 100}%` }
              ]}
            />
          </View>

          <Text style={styles.progressHint}>
            Using AI to detect product details, colors, sizes, and pricing...
          </Text>
        </View>
      )}

      {/* Actions */}
      {images.length > 0 && !isAnalyzing && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => {
              setImages([]);
              setAnalyzedProducts([]);
            }}
          >
            <Text style={styles.secondaryButtonText}>Clear All</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={analyzeProducts}
          >
            <Sparkles size={20} color={colors.neutral.white} />
            <Text style={styles.primaryButtonText}>
              Analyze with AI
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>✨ How it works</Text>
        <Text style={styles.infoText}>
          1. Select up to 50 product images{'\n'}
          2. AI analyzes each image to detect product details{'\n'}
          3. Review and edit AI-generated information{'\n'}
          4. Publish to your catalog
        </Text>
        <Text style={styles.infoNote}>
          💡 AI analyzes: product name, description, category, price, colors, sizes, and more
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.cream,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  headerTop: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary.green,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  uploadButton: {
    backgroundColor: colors.neutral.white,
    borderWidth: 2,
    borderColor: colors.primary.green,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: spacing.xxl,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  uploadText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary.green,
    marginTop: spacing.md,
  },
  uploadHint: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  imageWrapper: {
    width: 100,
    height: 100,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border.primary,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.status.error,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.neutral.white,
  },
  statusBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 4,
  },
  progressContainer: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 2,
    borderColor: colors.primary.green,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  progressStats: {
    marginBottom: spacing.md,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  progressSubtext: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.primary.cream,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary.green,
    borderRadius: 4,
  },
  progressHint: {
    fontSize: 12,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: 50,
  },
  primaryButton: {
    backgroundColor: colors.primary.green,
    shadowColor: 'rgba(46, 204, 113, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  secondaryButton: {
    backgroundColor: colors.neutral.white,
    borderWidth: 2,
    borderColor: colors.border.primary,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  infoCard: {
    backgroundColor: colors.accent.light,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary.green,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  infoNote: {
    fontSize: 12,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
});
