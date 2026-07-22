/**
 * Tabs Layout
 * Main app navigation with HopeRise design
 */

import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { LayoutDashboard, Package, ShoppingBag, Users, User, MessageCircle } from 'lucide-react-native';
import { colors } from '@fashion-retail/design-system';

// Safe icon wrapper to prevent undefined errors
function TabIcon({ Icon, color, size }: { Icon: any; color: string; size: number }) {
  if (!Icon) return <View style={{ width: size, height: size }} />;
  return <Icon size={size} color={color} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
          tabBarActiveTintColor: colors.primary.green,
          tabBarInactiveTintColor: colors.text.secondary,
          tabBarStyle: {
            backgroundColor: colors.neutral.white,
            borderTopWidth: 1,
            borderTopColor: colors.border.primary,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
            shadowColor: 'rgba(0, 0, 0, 0.1)',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 1,
            shadowRadius: 8,
            elevation: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
          headerStyle: {
            backgroundColor: colors.primary.cream,
            borderBottomWidth: 1,
            borderBottomColor: colors.border.primary,
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: colors.text.primary,
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarLabel: 'Dashboard',
            tabBarIcon: ({ color, size }) => (
              <TabIcon Icon={LayoutDashboard} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="products"
          options={{
            title: 'Products',
            tabBarLabel: 'Products',
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <TabIcon Icon={Package} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="whatsapp"
          options={{
            title: 'WhatsApp',
            tabBarLabel: 'WhatsApp',
            tabBarIcon: ({ color, size }) => (
              <TabIcon Icon={MessageCircle} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="diagnostic"
          options={{
            title: 'Diagnostic',
            tabBarLabel: 'Debug',
            tabBarIcon: ({ color, size }) => (
              <TabIcon Icon={User} size={size} color={color} />
            ),
          }}
        />
        {/* Temporarily hidden until routing issue is fixed */}
        <Tabs.Screen
          name="customers"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            href: null, // Hide from tab bar
          }}
        />
      </Tabs>
  );
}
