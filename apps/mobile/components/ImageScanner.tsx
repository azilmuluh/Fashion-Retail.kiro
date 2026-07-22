/**
 * Image Scanner Component
 * Allows users to upload images and AI will identify/separate products
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, X, Scan, CheckCircle, Package, Sparkles } from 'lucide-react-native';
import { colors, spacing } from '@fashion-retail/design-system';

interface DetectedProduct {
  id: string;
  name: string;
  category: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface ImageScannerProps {
  visible: boolean;
  onClose: () => void;
  onProductsDetected: (products: DetectedProduct[]) => void;
}

export default function ImageScanner({
  visible,
  onClose,
  onProductsDetected,
}: ImageScannerProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [detectedProducts, setDetectedProducts] = useState<DetectedProduct[]>([]);
  const [scanComplete, setScanComplete] = useState(false);

  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0);
      // Reset state when modal closes
      setSelectedImage(null);
      setDetectedProducts([]);
      setScanComplete(false);
    }
  }, [visible]);

  const requestPermissions = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!cameraPermission.granted || !mediaPermission.granted) {
      Alert.alert(
        'Permissions Required',
        'Please allow camera and photo library access to use this feature.'
      );
      return false;
    }
    return true;
  };

  const pickImageFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setScanComplete(false);
      setDetectedProducts([]);
    }
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setScanComplete(false);
      setDetectedProducts([]);
    }
  };

  const scanImage = async () => {
    if (!selectedImage) return;

    setIsScanning(true);

    // Simulate AI processing (replace with actual AI API call)
    setTimeout(() => {
      // Mock detected products
      const mockProducts: DetectedProduct[] = [
        {
          id: '1',
          name: 'Floral Summer Dress',
          category: 'dresses',
          confidence: 0.95,
          boundingBox: { x: 50, y: 100, width: 200, height: 300 },
        },
        {
          id: '2',
          name: 'Leather Handbag',
          category: 'accessories',
          confidence: 0.88,
          boundingBox: { x: 300, y: 200, width: 150, height: 150 },
        },
        {
          id: '3',
          name: 'White Sneakers',
          category: 'shoes',
          confidence: 0.92,
          boundingBox: { x: 100, y: 450, width: 180, height: 120 },
        },
      ];

      setDetectedProducts(mockProducts);
      setScanComplete(true);
      setIsScanning(false);
    }, 2500);
  };

  const handleConfirm = () => {
    onProductsDetected(detectedProducts);
    Alert.alert(
      'Products Detected',
      `Successfully detected ${detectedProducts.length} product(s). You can now add them to your inventory.`,
      [{ text: 'OK', onPress: onClose }]
    );
  };

  const getCategoryIcon = (category: string) => {
    // Return appropriate icon based on category
    return <Package size={16} color={colors.primary.green} />;
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Scan size={24} color={colors.primary.green} />
              <Text style={styles.headerTitle}>Image Scanner</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Instructions */}
            {!selectedImage && (
              <View style={styles.instructionsContainer}>
                <Sparkles size={48} color={colors.primary.green} />
                <Text style={styles.instructionsTitle}>AI Product Recognition</Text>
                <Text style={styles.instructionsText}>
                  Upload an image with multiple products, and our AI will automatically identify
                  and separate them for you.
                </Text>

                <View style={styles.featuresContainer}>
                  <View style={styles.featureItem}>
                    <CheckCircle size={20} color={colors.primary.green} />
                    <Text style={styles.featureText}>Identifies multiple products</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <CheckCircle size={20} color={colors.primary.green} />
                    <Text style={styles.featureText}>Auto-categorizes items</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <CheckCircle size={20} color={colors.primary.green} />
                    <Text style={styles.featureText}>Suggests product names</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Image Preview */}
            {selectedImage && (
              <View style={styles.imageContainer}>
                <Image source={{ uri: selectedImage }} style={styles.image} resizeMode="contain" />
                
                {!scanComplete && !isScanning && (
                  <TouchableOpacity style={styles.changeImageButton} onPress={pickImageFromGallery}>
                    <ImageIcon size={16} color={colors.primary.green} />
                    <Text style={styles.changeImageText}>Change Image</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Scanning Progress */}
            {isScanning && (
              <View style={styles.scanningContainer}>
                <ActivityIndicator size="large" color={colors.primary.green} />
                <Text style={styles.scanningText}>Analyzing image...</Text>
                <Text style={styles.scanningSubtext}>Detecting products with AI</Text>
              </View>
            )}

            {/* Detected Products */}
            {scanComplete && detectedProducts.length > 0 && (
              <View style={styles.resultsContainer}>
                <View style={styles.resultsHeader}>
                  <CheckCircle size={24} color={colors.status.success} />
                  <Text style={styles.resultsTitle}>
                    Found {detectedProducts.length} Product{detectedProducts.length !== 1 ? 's' : ''}
                  </Text>
                </View>

                <View style={styles.productsList}>
                  {detectedProducts.map((product) => (
                    <View key={product.id} style={styles.productCard}>
                      <View style={styles.productCardHeader}>
                        {getCategoryIcon(product.category)}
                        <Text style={styles.productName}>{product.name}</Text>
                      </View>
                      <View style={styles.productCardDetails}>
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>
                            {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
                          </Text>
                        </View>
                        <View style={styles.confidenceBadge}>
                          <Text style={styles.confidenceText}>
                            {Math.round(product.confidence * 100)}% confidence
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              {!selectedImage && (
                <>
                  <TouchableOpacity style={styles.actionButton} onPress={takePhoto}>
                    <Camera size={24} color={colors.neutral.white} />
                    <Text style={styles.actionButtonText}>Take Photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonSecondary]}
                    onPress={pickImageFromGallery}
                  >
                    <ImageIcon size={24} color={colors.primary.green} />
                    <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>
                      Choose from Gallery
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {selectedImage && !scanComplete && !isScanning && (
                <TouchableOpacity style={styles.actionButton} onPress={scanImage}>
                  <Scan size={24} color={colors.neutral.white} />
                  <Text style={styles.actionButtonText}>Scan Image</Text>
                </TouchableOpacity>
              )}

              {scanComplete && (
                <TouchableOpacity style={styles.actionButton} onPress={handleConfirm}>
                  <CheckCircle size={24} color={colors.neutral.white} />
                  <Text style={styles.actionButtonText}>Add to Inventory</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    backgroundColor: colors.neutral.white,
    borderRadius: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    padding: spacing.lg,
  },
  instructionsContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  instructionsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
  },
  instructionsText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
  },
  featuresContainer: {
    marginTop: spacing.lg,
    gap: spacing.md,
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent.light,
    padding: spacing.md,
    borderRadius: 12,
  },
  featureText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  imageContainer: {
    marginBottom: spacing.lg,
  },
  image: {
    width: '100%',
    height: 300,
    backgroundColor: colors.primary.beige,
    borderRadius: 16,
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  changeImageText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.green,
  },
  scanningContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  scanningText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  scanningSubtext: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  resultsContainer: {
    marginBottom: spacing.lg,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.accent.light,
    borderRadius: 12,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  productsList: {
    gap: spacing.md,
  },
  productCard: {
    backgroundColor: colors.primary.cream,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  productCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  productCardDetails: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  categoryBadge: {
    backgroundColor: colors.primary.green,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 50,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.white,
  },
  confidenceBadge: {
    backgroundColor: colors.neutral.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 50,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  actionsContainer: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionButton: {
    backgroundColor: colors.primary.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 50,
    shadowColor: 'rgba(46, 204, 113, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  actionButtonSecondary: {
    backgroundColor: colors.neutral.white,
    borderWidth: 2,
    borderColor: colors.primary.green,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  actionButtonTextSecondary: {
    color: colors.primary.green,
  },
});
