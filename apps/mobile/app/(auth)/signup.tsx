/**
 * Signup Screen
 * Account creation with Neo-Brutalist design
 */

import { useState } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Button,
  Input,
  colors,
  spacing,
} from '@fashion-retail/design-system';
import { useAuth } from '../../contexts/AuthContext';
import { isValidEmail, isValidPassword, isValidPhoneNumber, normalizePhoneNumber } from '@fashion-retail/shared';

export default function SignupScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  
  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    phoneNumber: '',
    whatsappNumber: '',
    password: '',
    confirmPassword: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function updateField(field: string, value: string) {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  }

  function validate() {
    const newErrors: Record<string, string> = {};

    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else {
      const normalized = normalizePhoneNumber(formData.phoneNumber);
      if (!isValidPhoneNumber(normalized)) {
        newErrors.phoneNumber = 'Invalid phone number (use +237XXXXXXXXX format)';
      }
    }

    if (!formData.whatsappNumber.trim()) {
      newErrors.whatsappNumber = 'WhatsApp number is required';
    } else {
      const normalized = normalizePhoneNumber(formData.whatsappNumber);
      if (!isValidPhoneNumber(normalized)) {
        newErrors.whatsappNumber = 'Invalid WhatsApp number (use +237XXXXXXXXX format)';
      }
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const passwordValidation = isValidPassword(formData.password);
      if (!passwordValidation.valid) {
        newErrors.password = passwordValidation.errors[0];
      }
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSignup() {
    console.log('handleSignup called');
    if (!validate()) {
      console.log('Validation failed');
      return;
    }

    console.log('Starting signup process...', {
      email: formData.email,
      business_name: formData.businessName,
    });

    setLoading(true);
    const { error } = await signUp(
      formData.email,
      formData.password,
      {
        business_name: formData.businessName,
        phone_number: normalizePhoneNumber(formData.phoneNumber),
        whatsapp_number: normalizePhoneNumber(formData.whatsappNumber),
      }
    );
    setLoading(false);

    console.log('Signup result:', { error });

    if (error) {
      console.error('Signup error:', error);
      Alert.alert('Signup Failed', error.message);
    } else {
      console.log('Signup successful!');
      Alert.alert(
        'Success!',
        'Account created successfully. Please check your email to verify your account.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Start managing your fashion retail business
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="BUSINESS NAME"
            placeholder="Your Fashion Store"
            value={formData.businessName}
            onChangeText={(text) => updateField('businessName', text)}
            error={errors.businessName}
          />

          <Input
            label="EMAIL ADDRESS"
            placeholder="your@email.com"
            value={formData.email}
            onChangeText={(text) => updateField('email', text)}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <Input
            label="PHONE NUMBER"
            placeholder="+237 XXX XXX XXX"
            value={formData.phoneNumber}
            onChangeText={(text) => updateField('phoneNumber', text)}
            keyboardType="phone-pad"
            error={errors.phoneNumber}
            helperText="Format: +237XXXXXXXXX"
          />

          <Input
            label="WHATSAPP NUMBER"
            placeholder="+237 XXX XXX XXX"
            value={formData.whatsappNumber}
            onChangeText={(text) => updateField('whatsappNumber', text)}
            keyboardType="phone-pad"
            error={errors.whatsappNumber}
            helperText="Used for customer communication"
          />

          <Input
            label="PASSWORD"
            placeholder="Create a password"
            value={formData.password}
            onChangeText={(text) => updateField('password', text)}
            secureTextEntry
            error={errors.password}
            helperText="Min 8 characters, 1 uppercase, 1 number"
          />

          <Input
            label="CONFIRM PASSWORD"
            placeholder="Re-enter password"
            value={formData.confirmPassword}
            onChangeText={(text) => updateField('confirmPassword', text)}
            secureTextEntry
            error={errors.confirmPassword}
          />

          <Button
            variant="primary"
            size="large"
            fullWidth
            onPress={handleSignup}
            loading={loading}
            disabled={loading}
            style={styles.signupButton}
          >
            CREATE ACCOUNT
          </Button>

          <View style={styles.divider} />

          <Text style={styles.loginText}>
            Already have an account?
          </Text>

          <Button
            variant="outline"
            size="large"
            fullWidth
            onPress={() => router.back()}
          >
            SIGN IN
          </Button>
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
    flexGrow: 1,
    padding: spacing.lg,
    paddingTop: spacing['2xl'],
    maxWidth: 600,
    marginHorizontal: 'auto',
    width: '100%',
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: spacing.sm,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.text.secondary,
    lineHeight: 24,
  },
  form: {
    gap: spacing.md,
  },
  signupButton: {
    marginTop: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.primary,
    marginVertical: spacing.lg,
  },
  loginText: {
    textAlign: 'center',
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
});
