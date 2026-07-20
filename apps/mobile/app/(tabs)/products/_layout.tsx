/**
 * Products Stack Layout
 * Navigation for product management screens
 */

import { Stack } from 'expo-router';
import { colors } from '@fashion-retail/design-system';

export default function ProductsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.ivory,
          borderBottomWidth: 2,
          borderBottomColor: colors.black,
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
      <Stack.Screen
        name="index"
        options={{
          title: 'PRODUCTS',
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          title: 'ADD PRODUCT',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'EDIT PRODUCT',
        }}
      />
    </Stack>
  );
}
