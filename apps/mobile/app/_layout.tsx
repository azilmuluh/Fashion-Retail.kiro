/**
 * Root Layout
 * Main app structure with authentication provider
 */

import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { colors } from '@fashion-retail/design-system';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.primary.cream,
          },
          headerTintColor: colors.text.primary,
          headerTitleStyle: {
            fontWeight: '700',
          },
          contentStyle: {
            backgroundColor: colors.primary.cream,
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
