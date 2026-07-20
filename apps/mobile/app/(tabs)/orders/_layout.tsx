import { Stack } from 'expo-router';

export default function OrdersLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#F5EFE0',
        },
        headerTintColor: '#000000',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'ORDERS',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'ORDER DETAILS',
        }}
      />
    </Stack>
  );
}
