import { Redirect, Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/aniverse';
import { isTvUi } from '@/lib/isTvUi';
import { setTvImmersiveFocusLock } from '@/lib/tvImmersiveFocus';
import { markWatchSessionOpen } from '@/lib/watchResumeSync';
import { useAuth } from '@/providers/AuthProvider';

export default function WatchLayout() {
  const { isAuthenticated, loading } = useAuth();
  const phoneWatch = !isTvUi();

  useEffect(() => {
    markWatchSessionOpen();
  }, []);

  useEffect(() => {
    if (phoneWatch) return;
    setTvImmersiveFocusLock(true);
    return () => setTvImmersiveFocusLock(false);
  }, [phoneWatch]);

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
