import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { SleekLogo } from '@/components/brand/SleekLogo';
import { colors, radii, spacing } from '@/constants/aniverse';
import { markCatalogDeeplinkUnlocked } from '@/lib/catalogDeeplinkUnlock';
import { parseMediaServerDeepLink } from '@/lib/mediaServerDeepLink';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Handles sleek://add-media-server?url=&name= from bot / Mini App «Открыть в Sleek».
 */
export default function AddMediaServerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ url?: string; name?: string; server_url?: string }>();
  const { isAuthenticated, loading } = useAuth();
  const [ready, setReady] = useState(false);

  const payload = useMemo(() => {
    const url = params.url ?? params.server_url;
    if (!url) return null;
    const qs = new URLSearchParams();
    qs.set('url', Array.isArray(url) ? url[0] : url);
    const name = params.name;
    if (name) qs.set('name', Array.isArray(name) ? name[0] : name);
    return parseMediaServerDeepLink(`sleek://add-media-server?${qs.toString()}`);
  }, [params.url, params.server_url, params.name]);

  useEffect(() => {
    if (!payload) return;
    void markCatalogDeeplinkUnlocked().finally(() => setReady(true));
  }, [payload]);

  if (loading || (payload && !ready)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  if (!payload) {
    return (
      <View style={styles.center}>
        <SleekLogo size={72} />
        <Text style={styles.title}>Неверная ссылка</Text>
        <Text style={styles.subtitle}>Ожидался sleek://add-media-server с параметром url.</Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.replace('/')}>
          <Text style={styles.primaryBtnText}>На главную</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <SleekLogo size={72} />
      <Text style={styles.title}>Каталог подключён</Text>
      {payload.serverName ? (
        <Text style={styles.serverName}>{payload.serverName}</Text>
      ) : null}
      <Text style={styles.subtitle}>
        {isAuthenticated
          ? 'Можно смотреть каталог Sleek в приложении.'
          : 'Войдите в аккаунт, чтобы пользоваться каталогом.'}
      </Text>
      <Text style={styles.url} numberOfLines={2}>
        {payload.serverUrl}
      </Text>
      <Pressable
        style={styles.primaryBtn}
        onPress={() => router.replace(isAuthenticated ? '/' : '/login')}
      >
        <Text style={styles.primaryBtnText}>{isAuthenticated ? 'В каталог' : 'Войти'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  serverName: {
    color: colors.brand,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  url: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
  primaryBtn: {
    backgroundColor: colors.brand,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    minWidth: 200,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: colors.brandOn,
    fontSize: 16,
    fontWeight: '700',
  },
});
