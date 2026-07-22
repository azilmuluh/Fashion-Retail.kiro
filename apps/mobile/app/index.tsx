/**
 * Index Screen
 * Landing/splash screen that routes to auth or main app
 */

import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '@fashion-retail/design-system';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [debugInfo, setDebugInfo] = useState('Initializing...');

  useEffect(() => {
    console.log('=== INDEX ROUTING DEBUG ===');
    console.log('Loading:', loading);
    console.log('User exists:', !!user);
    console.log('Segments:', segments);
    
    setDebugInfo(`Loading: ${loading}, User: ${!!user}, Segments: ${segments.join('/')}`);
    
    // Timeout safety - if stuck loading for more than 3 seconds, force navigation
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('⚠️ Loading timeout - forcing navigation to demo');
        setDebugInfo('Timeout - forcing navigation...');
        router.replace('/(auth)/demo');
      }
    }, 3000);
    
    if (loading) {
      console.log('Still loading, waiting...');
      return () => clearTimeout(timeout);
    }

    const inAuthGroup = segments[0] === '(auth)';
    console.log('In auth group:', inAuthGroup);

    if (!user && !inAuthGroup) {
      console.log('No user, not in auth → Redirect to demo');
      setDebugInfo('Redirecting to demo...');
      router.replace('/(auth)/demo');
    } else if (user && inAuthGroup) {
      console.log('User exists, in auth group → Redirect to dashboard');
      setDebugInfo('Redirecting to dashboard...');
      router.replace('/(tabs)');
    } else if (user) {
      console.log('User exists → Redirect to dashboard');
      setDebugInfo('Redirecting to dashboard...');
      router.replace('/(tabs)');
    }
    
    return () => clearTimeout(timeout);
  }, [user, loading, segments]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary.green} />
      <Text style={styles.debugText}>{debugInfo}</Text>
      <Text style={styles.helpText}>
        If stuck here, check browser console for errors
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary.cream,
    padding: 20,
  },
  debugText: {
    marginTop: 20,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  helpText: {
    marginTop: 10,
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
