import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { approveDeviceAuthSession, declineDeviceAuthSession } from '@/api/auth';
import { SleekLogo } from '@/components/brand/SleekLogo';
import { colors, radii, spacing } from '@/constants/aniverse';
import { useAuth } from '@/providers/AuthProvider';

type Status = 'idle' | 'pending' | 'done' | 'declined' | 'error';

export default function DeviceApproveScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const code = (params.code ?? '').trim().toUpperCase();
  const { isAuthenticated, loading } = useAuth();
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const autoApproveStarted = useRef(false);

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

  const decline = async () => {
    if (!code) return;
    setStatus('pending');
    setMessage(null);
    try {
      await declineDeviceAuthSession(code);
      setStatus('declined');
      setMessage('Вход на TV отклонён.');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Не удалось отклонить вход');
    }
  };

  useEffect(() => {
    if (loading || !isAuthenticated || !code || autoApproveStarted.current) return;
    autoApproveStarted.current = true;
    void approve();
    // Auto-approve once when landing authenticated with a device code (e.g. after login).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAuthenticated, code]);

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

  const busy = status === 'pending' || status === 'done' || status === 'declined';

  return (
    <View style={styles.center}>
      <SleekLogo size={72} />
      <Text style={styles.title}>Подтвердить TV</Text>
      {code ? <Text style={styles.code}>{code}</Text> : null}
      <Text style={styles.subtitle}>
        {status === 'pending'
          ? 'Подтверждаем вход на телевизоре…'
          : status === 'done'
            ? 'Вход на телевизоре подтверждён.'
            : status === 'declined'
              ? 'Вход на телевизоре отклонён.'
              : 'Разрешить вход на телевизоре с этим кодом?'}
      </Text>
      {message ? (
        <Text
          style={[
            styles.message,
            status === 'error' && styles.messageError,
            status === 'declined' && styles.messageWarn,
          ]}
        >
          {message}
        </Text>
      ) : null}
      <Pressable
        style={[styles.primaryBtn, (!code || busy) && styles.primaryBtnDisabled]}
        disabled={!code || busy}
        onPress={() => void approve()}
      >
        <Text style={styles.primaryBtnText}>
          {status === 'done' ? 'Готово' : status === 'pending' ? 'Обрабатываем…' : 'Подтвердить'}
        </Text>
      </Pressable>
      {status !== 'done' && status !== 'declined' ? (
        <Pressable
          style={[styles.secondaryBtn, (!code || status === 'pending') && styles.primaryBtnDisabled]}
          disabled={!code || status === 'pending'}
          onPress={() => void decline()}
        >
          <Text style={styles.secondaryBtnText}>Отклонить</Text>
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
  messageWarn: {
    color: '#fbbf24',
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
  secondaryBtn: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    minWidth: 200,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    color: colors.brand,
    fontSize: 14,
    fontWeight: '600',
  },
});
