import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppShell } from '@/components/shell/AppShell';
import { colors } from '@/constants/aniverse';
import { isTvUi } from '@/lib/isTvUi';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Stack at (main) wraps the hub Tabs group plus secondary routes (search,
 * profile, library, detail, …). Hub keep-alive lives in `(tabs)`.
 *
 * Anime/movies/series/person detail screens live on this stack (not inside
 * a hub tab) so Home → title → Back pops to Home instead of switching tabs.
 * freezeOnBlur keeps the tab catalog mounted under the detail screen.
 */
export default function MainLayout() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <AppShell>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: isTvUi() ? 'none' : 'fade',
          contentStyle: { backgroundColor: colors.bg },
          freezeOnBlur: true,
        }}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
