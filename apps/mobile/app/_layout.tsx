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
            backgroundColor: colors.ivory,
          },
          headerTintColor: colors.black,
          headerTitleStyle: {
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: 1,
          },
          contentStyle: {
            backgroundColor: colors.ivory,
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
