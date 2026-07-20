/**
 * Forgot Password Screen
 * Password reset flow
 */

import { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Button,
  Input,
  Card,
  Heading2,
  BodyText,
  colors,
  spacing,
} from '@fashion-retail/design-system';
import { useAuth } from '../../contexts/AuthContext';
import { isValidEmail } from '@fashion-retail/shared';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function validate() {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!isValidEmail(email)) {
      setError('Invalid email address');
      return false;
    }
    return true;
  }

  async function handleResetPassword() {
    if (!validate()) return;

    setLoading(true);
    const { error: resetError } = await resetPassword(email);
    setLoading(false);

    if (resetError) {
      Alert.alert('Error', resetError.message);
    } else {
      Alert.alert(
        'Check Your Email',
        'We\'ve sent you a password reset link. Please check your inbox.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Card variant="brutal" style={styles.card}>
          <Heading2 style={styles.title}>RESET PASSWORD</Heading2>
          <BodyText style={styles.description}>
            Enter your email address and we'll send you a link to reset your password.
          </BodyText>

          <Input
            label="EMAIL ADDRESS"
            placeholder="your@email.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (error) setError('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            error={error}
          />

          <Button
            variant="primary"
            size="large"
            fullWidth
            onPress={handleResetPassword}
            loading={loading}
            disabled={loading}
          >
            SEND RESET LINK
          </Button>

          <Button
            variant="ghost"
            fullWidth
            onPress={() => router.back()}
          >
            Back to Sign In
          </Button>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing[6],
    justifyContent: 'center',
  },
  card: {
    gap: spacing[4],
  },
  title: {
    marginBottom: spacing[2],
    color: colors.black,
  },
  description: {
    color: colors.text.secondary,
    marginBottom: spacing[4],
  },
});
