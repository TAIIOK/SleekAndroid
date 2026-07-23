import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeviceQrLogin } from '@/components/auth/DeviceQrLogin';
import { OnScreenKeyboard } from '@/components/auth/OnScreenKeyboard';
import { SleekLogo } from '@/components/brand/SleekLogo';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { colors, radii, spacing } from '@/constants/aniverse';
import { useAuth } from '@/providers/AuthProvider';
import { isTvUi } from '@/lib/isTvUi';

export default function LoginScreen() {
  const router = useRouter();
  const { addAccount, from } = useLocalSearchParams<{ addAccount?: string; from?: string }>();
  const isAddAccount = addAccount === '1';
  const redirectPath =
    typeof from === 'string' && from.startsWith('/') ? from : isAddAccount ? '/accounts' : '/';
  const { isAuthenticated, loading, login, refreshUser } = useAuth();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [activeField, setActiveField] = useState<'login' | 'password'>('login');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'qr' | 'keyboard'>(isTvUi() ? 'qr' : 'keyboard');
  const [qrRefreshTag, setQrRefreshTag] = useState<number | undefined>();

  const onAuthenticated = useCallback(() => {
    void refreshUser().then(() => router.replace(redirectPath as '/'));
  }, [refreshUser, router, redirectPath]);

  const appendChar = useCallback(
    (char: string) => {
      if (activeField === 'login') setLoginId((v) => v + char);
      else setPassword((v) => v + char);
    },
    [activeField],
  );

  const backspace = useCallback(() => {
    if (activeField === 'login') setLoginId((v) => v.slice(0, -1));
    else setPassword((v) => v.slice(0, -1));
  }, [activeField]);

  const submit = useCallback(() => {
    setSubmitting(true);
    setError(null);
    void login(loginId, password)
      .then(() => router.replace(redirectPath as '/'))
      .catch((err) => setError(err instanceof Error ? err.message : 'Ошибка входа'))
      .finally(() => setSubmitting(false));
  }, [login, loginId, password, router, redirectPath]);

  const handleKeyboardKey = useCallback(
    (key: string) => {
      if (key === 'BACK') backspace();
      else if (key === 'SPACE') appendChar(' ');
      else if (key === 'SUBMIT') submit();
      else appendChar(key);
    },
    [appendChar, backspace, submit],
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  if (isAuthenticated && !isAddAccount) {
    return <Redirect href="/" />;
  }

  const isTv = isTvUi();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={[styles.scroll, isTv && styles.scrollTv]}
        keyboardShouldPersistTaps="handled"
      >
        <SleekLogo size={isTv ? 52 : 72} />
        <Text style={[styles.brandTitle, isTv && styles.brandTitleTv]}>Sleek</Text>
        <Text style={[styles.subtitle, isTv && styles.subtitleTv]}>
          Войдите для доступа к каталогу
        </Text>

        <GlassSurface
          rounded="lg"
          style={[
            styles.card,
            isTv && styles.cardTv,
            isTv && mode === 'keyboard' && styles.cardTvKeyboard,
          ]}
        >
          {isTv && (
            <View style={styles.modeRow}>
              <ModeButton
                label="QR"
                active={mode === 'qr'}
                onPress={() => setMode('qr')}
                nextFocusDown={mode === 'qr' ? qrRefreshTag : undefined}
              />
              <ModeButton
                label="Клавиатура"
                active={mode === 'keyboard'}
                onPress={() => setMode('keyboard')}
                nextFocusDown={mode === 'qr' ? qrRefreshTag : undefined}
              />
            </View>
          )}

          {isTv && mode === 'qr' ? (
            <DeviceQrLogin
              onAuthenticated={onAuthenticated}
              onRefreshNativeTag={(tag) => setQrRefreshTag(tag)}
            />
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>Логин</Text>
              <TextInput
                style={[styles.input, isTv && styles.inputTv]}
                value={loginId}
                onChangeText={setLoginId}
                onFocus={() => setActiveField('login')}
                autoCapitalize="none"
                placeholderTextColor={colors.textSecondary}
                placeholder="Email или логин"
              />
              <Text style={styles.label}>Пароль</Text>
              <TextInput
                style={[styles.input, isTv && styles.inputTv]}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setActiveField('password')}
                secureTextEntry
                placeholderTextColor={colors.textSecondary}
                placeholder="Пароль"
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Pressable style={styles.submitButton} onPress={submit} disabled={submitting}>
                <Text style={styles.submitLabel}>{submitting ? 'Вход…' : 'Войти'}</Text>
              </Pressable>
            </View>
          )}

          {isTv && mode === 'keyboard' && (
            <OnScreenKeyboard onKey={handleKeyboardKey} initialLayout="en" />
          )}
        </GlassSurface>
      </ScrollView>
    </SafeAreaView>
  );
}

function ModeButton({
  label,
  active,
  onPress,
  nextFocusDown,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  nextFocusDown?: number;
}) {
  return (
    <TvFocusable
      onPress={onPress}
      nextFocusDown={nextFocusDown}
      style={[styles.modeButton, active && styles.modeButtonActive]}
      focusedStyle={styles.modeButtonFocused}
    >
      <Text style={styles.modeButtonLabel}>{label}</Text>
    </TvFocusable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    padding: spacing.xxl,
    gap: spacing.lg,
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
  },
  scrollTv: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    justifyContent: 'center',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  brandTitle: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  brandTitleTv: {
    fontSize: 26,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.bgLow,
  },
  cardTv: {
    maxWidth: 760,
    padding: spacing.md,
    gap: spacing.md,
    overflow: 'visible',
  },
  cardTvKeyboard: {
    maxWidth: 900,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  subtitleTv: {
    fontSize: 14,
    marginBottom: 0,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  modeButtonActive: {
    backgroundColor: 'rgba(195,192,255,0.2)',
    borderColor: colors.brand,
  },
  modeButtonFocused: {
    backgroundColor: 'rgba(195,192,255,0.28)',
    borderColor: colors.brand,
  },
  modeButtonLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  form: {
    width: '100%',
    gap: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#09090b',
    borderRadius: radii.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputTv: {
    paddingVertical: 12,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: colors.brandAccent,
    borderRadius: radii.pill,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  submitLabel: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
});
