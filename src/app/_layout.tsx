import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import '@/global.css';
import { GlobalShell } from '@/components/shell/GlobalShell';
import { AuthProvider } from '@/providers/AuthProvider';
import { QueryProvider } from '@/providers/QueryProvider';

export default function RootLayout() {
  return (
    <QueryProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <GlobalShell />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#13121b' } }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="auth/device" />
          <Stack.Screen name="add-media-server" />
          <Stack.Screen name="catalog/connect" />
          <Stack.Screen name="(main)" />
          <Stack.Screen name="watch" options={{ presentation: 'fullScreenModal' }} />
        </Stack>
      </AuthProvider>
    </QueryProvider>
  );
}
