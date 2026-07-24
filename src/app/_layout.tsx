import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import '@/global.css';
import { GlobalShell } from '@/components/shell/GlobalShell';
import { RootErrorBoundary } from '@/components/shell/RootErrorBoundary';
import { initCrashReporting } from '@/lib/crashReporting';
import { ensureImageCdnPreference } from '@/lib/imageCdn';
import { isTvUi } from '@/lib/isTvUi';
import { AuthProvider } from '@/providers/AuthProvider';
import { QueryProvider } from '@/providers/QueryProvider';

initCrashReporting();
void ensureImageCdnPreference();

export default function RootLayout() {
  const watchScreenOptions = isTvUi()
    ? {
        presentation: 'fullScreenModal' as const,
        contentStyle: { backgroundColor: '#000' },
      }
    : {
        presentation: 'fullScreenModal' as const,
        orientation: 'landscape' as const,
        statusBarHidden: true,
        navigationBarHidden: true,
        contentStyle: { backgroundColor: '#000' },
        animation: 'fade' as const,
      };

  return (
    <RootErrorBoundary>
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
            <Stack.Screen name="watch" options={watchScreenOptions} />
          </Stack>
        </AuthProvider>
      </QueryProvider>
    </RootErrorBoundary>
  );
}
