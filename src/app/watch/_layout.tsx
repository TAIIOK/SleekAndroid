import { Redirect, Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/aniverse';
import { isTvUi } from '@/lib/isTvUi';
import { useAuth } from '@/providers/AuthProvider';

export default function WatchLayout() {
  const { isAuthenticated, loading } = useAuth();
  const phoneWatch = !isTvUi();

  if (loading) {
    return (
      <View style={styles.root}>
        {phoneWatch ? <StatusBar hidden style="light" /> : null}
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={styles.root}>
      {phoneWatch ? <StatusBar hidden style="light" /> : null}
      <Slot />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
});
