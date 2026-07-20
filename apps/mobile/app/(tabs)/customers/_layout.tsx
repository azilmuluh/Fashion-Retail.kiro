import { Stack } from 'expo-router';

export default function CustomersLayout() {
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
          title: 'CUSTOMERS',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'CUSTOMER DETAILS',
        }}
      />
    </Stack>
  );
}
