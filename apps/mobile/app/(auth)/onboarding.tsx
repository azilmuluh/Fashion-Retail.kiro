/**
 * Onboarding Screen
 * Multi-step wizard for new retailers
 */

import { useState } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Button,
  Card,
  Input,
  Badge,
  Heading2,
  Heading3,
  BodyText,
  Label,
  colors,
  spacing,
} from '@fashion-retail/design-system';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

const STEPS = [
  {
    title: 'WELCOME',
    description: 'Let\'s set up your fashion retail dashboard',
  },
  {
    title: 'BUSINESS DETAILS',
    description: 'Tell us more about your business',
  },
  {
    title: 'PREFERENCES',
    description: 'Customize your experience',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { retailer, updateProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Form data
  const [businessAddress, setBusinessAddress] = useState('');
  const [currency, setCurrency] = useState('XAF');
  const [timezone, setTimezone] = useState('Africa/Douala');

  async function handleComplete() {
    setLoading(true);
    await updateProfile({
      business_address: businessAddress,
      currency,
      timezone,
    });
    setLoading(false);
    router.replace('/(tabs)');
  }

  function renderStep() {
    switch (currentStep) {
      case 0:
        return (
          <Card variant="brutal" style={styles.stepCard}>
            <Heading2 style={styles.stepTitle}>WELCOME TO FASHION RETAIL!</Heading2>
            <BodyText style={styles.stepDescription}>
              Your all-in-one platform for managing your fashion business in Cameroon.
            </BodyText>
            
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Badge variant="accent">✓</Badge>
                <View style={styles.featureText}>
                  <Label>WHATSAPP INTEGRATION</Label>
                  <BodyText>Chat with customers directly</BodyText>
                </View>
              </View>

              <View style={styles.featureItem}>
                <Badge variant="accent">✓</Badge>
                <View style={styles.featureText}>
                  <Label>INVENTORY TRACKING</Label>
                  <BodyText>Manage your products in real-time</BodyText>
                </View>
              </View>

              <View style={styles.featureItem}>
                <Badge variant="accent">✓</Badge>
                <View style={styles.featureText}>
                  <Label>LOYALTY PROGRAM</Label>
                  <BodyText>Reward repeat customers</BodyText>
                </View>
              </View>

              <View style={styles.featureItem}>
                <Badge variant="accent">✓</Badge>
                <View style={styles.featureText}>
                  <Label>ANALYTICS</Label>
                  <BodyText>Track sales and insights</BodyText>
                </View>
              </View>
            </View>
          </Card>
        );

      case 1:
        return (
          <Card variant="brutal" style={styles.stepCard}>
            <Heading3 style={styles.stepTitle}>BUSINESS DETAILS</Heading3>
            <BodyText style={styles.stepDescription}>
              Help us personalize your dashboard
            </BodyText>

            <View style={styles.businessInfo}>
              <Label>BUSINESS NAME</Label>
              <BodyText style={styles.infoValue}>{retailer?.business_name}</BodyText>
            </View>

            <View style={styles.businessInfo}>
              <Label>WHATSAPP NUMBER</Label>
              <BodyText style={styles.infoValue}>{retailer?.whatsapp_number}</BodyText>
            </View>

            <Input
              label="BUSINESS ADDRESS (OPTIONAL)"
              placeholder="123 Main Street, Douala"
              value={businessAddress}
              onChangeText={setBusinessAddress}
              multiline
              numberOfLines={3}
            />
          </Card>
        );

      case 2:
        return (
          <Card variant="brutal" style={styles.stepCard}>
            <Heading3 style={styles.stepTitle}>PREFERENCES</Heading3>
            <BodyText style={styles.stepDescription}>
              Set your currency and timezone
            </BodyText>

            <View style={styles.preferenceItem}>
              <Label>CURRENCY</Label>
              <View style={styles.currencyOptions}>
                {['XAF', 'USD', 'EUR'].map((curr) => (
                  <Button
                    key={curr}
                    variant={currency === curr ? 'primary' : 'outline'}
                    onPress={() => setCurrency(curr)}
                    style={styles.currencyButton}
                  >
                    {curr}
                  </Button>
                ))}
              </View>
            </View>

            <View style={styles.preferenceItem}>
              <Label>TIMEZONE</Label>
              <BodyText style={styles.timezoneValue}>Africa/Douala (WAT)</BodyText>
              <BodyText style={styles.timezoneNote}>
                West Africa Time (UTC+1)
              </BodyText>
            </View>
          </Card>
        );

      default:
        return null;
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Progress Indicator */}
      <View style={styles.progress}>
        {STEPS.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index <= currentStep && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.stepIndicator}>
          <Label>STEP {currentStep + 1} OF {STEPS.length}</Label>
        </View>

        {renderStep()}

        <View style={styles.actions}>
          {currentStep > 0 && (
            <Button
              variant="outline"
              size="large"
              onPress={() => setCurrentStep(currentStep - 1)}
              style={styles.actionButton}
            >
              BACK
            </Button>
          )}

          {currentStep < STEPS.length - 1 ? (
            <Button
              variant="primary"
              size="large"
              onPress={() => setCurrentStep(currentStep + 1)}
              style={styles.actionButton}
            >
              NEXT
            </Button>
          ) : (
            <Button
              variant="primary"
              size="large"
              onPress={handleComplete}
              loading={loading}
              disabled={loading}
              style={styles.actionButton}
            >
              GET STARTED
            </Button>
          )}
        </View>

        {currentStep === 0 && (
          <Button
            variant="ghost"
            onPress={() => router.replace('/(tabs)')}
            style={styles.skipButton}
          >
            Skip for now
          </Button>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.black,
  },
  progressDot: {
    width: 40,
    height: 4,
    backgroundColor: colors.gray[300],
    borderRadius: 2,
  },
  progressDotActive: {
    backgroundColor: colors.safetyOrange,
  },
  scrollContent: {
    padding: spacing[6],
  },
  stepIndicator: {
    marginBottom: spacing[4],
  },
  stepCard: {
    marginBottom: spacing[6],
  },
  stepTitle: {
    marginBottom: spacing[3],
  },
  stepDescription: {
    color: colors.text.secondary,
    marginBottom: spacing[6],
  },
  featureList: {
    gap: spacing[4],
  },
  featureItem: {
    flexDirection: 'row',
    gap: spacing[3],
    alignItems: 'flex-start',
  },
  featureText: {
    flex: 1,
    gap: spacing[1],
  },
  businessInfo: {
    marginBottom: spacing[4],
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.black,
    marginTop: spacing[1],
  },
  preferenceItem: {
    marginBottom: spacing[6],
  },
  currencyOptions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  currencyButton: {
    flex: 1,
  },
  timezoneValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.black,
    marginTop: spacing[2],
  },
  timezoneNote: {
    color: colors.text.muted,
    fontSize: 14,
    marginTop: spacing[1],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  actionButton: {
    flex: 1,
  },
  skipButton: {
    marginTop: spacing[4],
  },
});
