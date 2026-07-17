import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { approveDeviceAuthSession } from '@/api/auth';
import { SleekLogo } from '@/components/brand/SleekLogo';
import { colors, radii, spacing } from '@/constants/aniverse';
import { useAuth } from '@/providers/AuthProvider';

export default function DeviceApproveScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const code = (params.code ?? '').trim().toUpperCase();
  const { isAuthenticated, loading } = useAuth();
  const [status, setStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!code) setMessage('Код устройства не указан');
  }, [code]);

  const approve = async () => {
    if (!code) return;
    setStatus('pending');
    setMessage(null);
    try {
      await approveDeviceAuthSession(code);
      setStatus('done');
      setMessage('TV авторизован. Можно вернуться к телевизору.');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Не удалось подтвердить вход');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    const from = `/auth/device?code=${encodeURIComponent(code)}`;
    return (
      <View style={styles.center}>
        <SleekLogo size={72} />
        <Text style={styles.title}>Вход на TV</Text>
        <Text style={styles.subtitle}>
          Войдите в аккаунт, чтобы подтвердить устройство{code ? ` ${code}` : ''}.
        </Text>
        <Pressable
          style={styles.primaryBtn}
          onPress={() =>
            router.push({
              pathname: '/login',
              params: { from },
            })
          }
        >
          <Text style={styles.primaryBtnText}>Войти</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <SleekLogo size={72} />
      <Text style={styles.title}>Подтвердить TV</Text>
      {code ? <Text style={styles.code}>{code}</Text> : null}
      <Text style={styles.subtitle}>Разрешить вход на телевизоре с этим кодом?</Text>
      {message ? (
        <Text style={[styles.message, status === 'error' && styles.messageError]}>{message}</Text>
      ) : null}
      <Pressable
        style={[styles.primaryBtn, (!code || status === 'done') && styles.primaryBtnDisabled]}
        disabled={!code || status === 'pending' || status === 'done'}
        onPress={() => void approve()}
      >
        <Text style={styles.primaryBtnText}>
          {status === 'done' ? 'Готово' : status === 'pending' ? 'Подтверждаем…' : 'Подтвердить'}
        </Text>
      </Pressable>
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
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  code: {
    color: colors.brand,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
  message: {
    color: '#34d399',
    fontSize: 14,
    textAlign: 'center',
  },
  messageError: {
    color: colors.danger,
  },
  primaryBtn: {
    backgroundColor: colors.brand,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    minWidth: 200,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.5,
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
