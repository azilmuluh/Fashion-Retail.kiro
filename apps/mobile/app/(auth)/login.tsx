/**
 * Login Screen
 * Neo-Brutalist authentication screen
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
import { isValidEmail } from '@fashion-retail/shared';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  function validate() {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleLogin() {
    console.log('=== LOGIN DEBUG START ===');
    console.log('Email:', email);
    
    if (!validate()) {
      console.log('Validation failed');
      return;
    }

    console.log('Validation passed, attempting login...');
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    console.log('Login result:', { error });

    if (error) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', error.message);
    } else {
      console.log('Login successful! Redirecting to dashboard...');
      // Force redirect to dashboard
      router.replace('/(tabs)');
    }
    console.log('=== LOGIN DEBUG END ===');
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
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>
            Access your fashion retail dashboard
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="EMAIL ADDRESS"
            placeholder="your@email.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors({ ...errors, email: undefined });
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <Input
            label="PASSWORD"
            placeholder="Enter your password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) setErrors({ ...errors, password: undefined });
            }}
            secureTextEntry
            error={errors.password}
          />

          <Button
            variant="ghost"
            onPress={() => router.push('/(auth)/forgot-password')}
            style={styles.forgotButton}
          >
            Forgot Password?
          </Button>

          <Button
            variant="primary"
            size="large"
            fullWidth
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
          >
            SIGN IN
          </Button>

          <View style={styles.divider} />

          <Text style={styles.signupText}>
            Don't have an account?
          </Text>

          <Button
            variant="outline"
            size="large"
            fullWidth
            onPress={() => router.push('/(auth)/signup')}
          >
            CREATE ACCOUNT
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
    justifyContent: 'center',
    maxWidth: 500,
    marginHorizontal: 'auto',
    width: '100%',
    minHeight: '100%',
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
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.primary,
    marginVertical: spacing.lg,
  },
  signupText: {
    textAlign: 'center',
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
});
