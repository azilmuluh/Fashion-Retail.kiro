/**
 * Tabs Layout
 * Main app navigation
 */

import { Tabs } from 'expo-router';
import { colors } from '@fashion-retail/design-system';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.safetyOrange,
        tabBarInactiveTintColor: colors.gray[600],
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 2,
          borderTopColor: colors.black,
        },
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
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'DASHBOARD',
          tabBarLabel: 'Dashboard',
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'PRODUCTS',
          tabBarLabel: 'Products',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'ORDERS',
          tabBarLabel: 'Orders',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'CUSTOMERS',
          tabBarLabel: 'Customers',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'PROFILE',
          tabBarLabel: 'Profile',
        }}
      />
    </Tabs>
  );
}
