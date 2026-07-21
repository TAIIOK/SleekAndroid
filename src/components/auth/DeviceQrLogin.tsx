import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { createDeviceAuthSession, pollDeviceAuthSession } from '@/api/auth';
import { QrCodeMatrix } from '@/components/auth/QrCodeMatrix';
import { colors, spacing } from '@/constants/aniverse';
import { getOrCreateDeviceId } from '@/lib/storage';
import { isTvUi } from '@/lib/isTvUi';

interface DeviceQrLoginProps {
  onAuthenticated: () => void;
}

const QR_SIZE = isTvUi() ? 168 : 200;

export function DeviceQrLogin({ onAuthenticated }: DeviceQrLoginProps) {
  const [code, setCode] = useState<string | null>(null);
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      setLoading(true);
      setError(null);
      try {
        const session = await createDeviceAuthSession({
          deviceId: await getOrCreateDeviceId(),
          platform: 'tv_android',
        });
        if (cancelled) return;
        setCode(session.code);
        setVerifyUrl(session.verifyUrl);
        setLoading(false);

        const pollMs = Math.max(2, session.pollIntervalSec) * 1000;
        const poll = async () => {
          if (cancelled || !session.code) return;
          try {
            const result = await pollDeviceAuthSession(session.code);
            if ('status' in result) return;
            const { setTokens } = await import('@/lib/storage');
            await setTokens(result.accessToken, result.refreshToken);
            onAuthenticated();
          } catch (err) {
            if (err instanceof Error && err.message.includes('истёк')) {
              setError(err.message);
              if (pollTimer.current) clearInterval(pollTimer.current);
            }
          }
        };

        pollTimer.current = setInterval(() => void poll(), pollMs);
        void poll();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Не удалось создать сессию');
          setLoading(false);
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [onAuthenticated]);

  return (
    <View style={styles.container}>
      <View style={styles.qrBox}>
        {loading || !verifyUrl ? (
          <View style={[styles.qrPlaceholder, { width: QR_SIZE, height: QR_SIZE }]} />
        ) : (
          <QrCodeMatrix value={verifyUrl} size={QR_SIZE} />
        )}
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.title}>Вход по QR</Text>
        <Text style={styles.subtitle}>
          Откройте Sleek на телефоне, войдите в аккаунт и подтвердите код — или отсканируйте QR.
        </Text>
        {code ? <Text style={styles.code}>{code}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <Text style={styles.subtitle}>Генерация кода…</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: isTvUi() ? 'row' : 'column',
    alignItems: 'center',
    gap: isTvUi() ? spacing.lg : spacing.xl,
    width: '100%',
  },
  qrBox: {
    backgroundColor: '#fff',
    padding: spacing.sm,
    borderRadius: 12,
    flexShrink: 0,
  },
  qrPlaceholder: {
    backgroundColor: '#e5e5e5',
    borderRadius: 8,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: isTvUi() ? 24 : 22,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: isTvUi() ? 15 : 15,
    lineHeight: isTvUi() ? 22 : 22,
  },
  code: {
    color: colors.brand,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: isTvUi() ? 32 : 28,
    letterSpacing: 4,
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
    fontSize: 15,
  },
});
