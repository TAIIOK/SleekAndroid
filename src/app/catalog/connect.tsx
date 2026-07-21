import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { fetchCatalogDeeplink } from '@/api/auth';
import { SubscriptionRequiredError } from '@/api/client';
import { SleekLogo } from '@/components/brand/SleekLogo';
import { colors, radii, spacing } from '@/constants/aniverse';
import { parseMediaServerDeepLink } from '@/lib/mediaServerDeepLink';
import { useAuth } from '@/providers/AuthProvider';

type Status = 'loading' | 'ready' | 'denied' | 'error';

/**
 * Phone helper (parity with site `/catalog/connect`): fetch JWT deeplink and open in-app handler.
 */
export default function CatalogConnectScreen() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<Status>('loading');
  const [serverName, setServerName] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [openParams, setOpenParams] = useState<{ url: string; name?: string } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace({ pathname: '/login', params: { from: '/catalog/connect' } });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await fetchCatalogDeeplink();
        if (cancelled) return;
        setServerName(data.serverName ?? null);
        const parsed = parseMediaServerDeepLink(data.deeplink);
        if (!parsed) {
          setStatus('error');
          setMessage('Сервер вернул некорректную ссылку');
          return;
        }
        setOpenParams({ url: parsed.serverUrl, name: parsed.serverName });
        setStatus('ready');
        router.replace({
          pathname: '/add-media-server',
          params: {
            url: parsed.serverUrl,
            ...(parsed.serverName ? { name: parsed.serverName } : {}),
          },
        });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof SubscriptionRequiredError) {
          setStatus('denied');
          setMessage('Нет доступа к каталогу. Оформите подписку в боте.');
          return;
        }
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Не удалось получить ссылку');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || status === 'loading' || status === 'ready') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} size="large" />
        <Text style={styles.subtitle}>Получаем ссылку для Sleek…</Text>
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <SleekLogo size={72} />
      <Text style={styles.title}>Подключить каталог</Text>
      {serverName ? <Text style={styles.serverName}>{serverName}</Text> : null}

      <Text style={[styles.subtitle, status === 'denied' ? styles.warn : styles.error]}>
        {message}
      </Text>

      {openParams ? (
        <Pressable
          style={styles.primaryBtn}
          onPress={() =>
            router.replace({
              pathname: '/add-media-server',
              params: {
                url: openParams.url,
                ...(openParams.name ? { name: openParams.name } : {}),
              },
            })
          }
        >
          <Text style={styles.primaryBtnText}>Повторить</Text>
        </Pressable>
      ) : null}

      <Pressable onPress={() => router.replace('/')}>
        <Text style={styles.link}>На главную</Text>
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
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  warn: { color: '#fbbf24' },
  error: { color: colors.danger },
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
  link: {
    color: colors.brand,
    fontSize: 14,
    fontWeight: '600',
  },
});
