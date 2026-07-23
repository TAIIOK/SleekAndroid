import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { getSavedAccounts, removeSavedAccount } from '@/lib/savedAccounts';
import { colors, spacing, tvFocus } from '@/constants/aniverse';
import { useAuth } from '@/providers/AuthProvider';
import { useMobileChromeScrollProps } from '@/providers/MobileChromeScroll';
import { isTvUi } from '@/lib/isTvUi';

export default function AccountsScreen() {
  const router = useRouter();
  const { switchAccount, user, logout } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const chromeScrollProps = useMobileChromeScrollProps(undefined, styles.content);

  const { data: accounts = [], refetch } = useQuery({
    queryKey: ['saved-accounts'],
    queryFn: getSavedAccounts,
  });

  const onSwitch = async (id: string) => {
    setError(null);
    try {
      await switchAccount(id);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
      void refetch();
    }
  };

  const onRemove = (id: string, label: string) => {
    Alert.alert('Удалить аккаунт?', label, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          void removeSavedAccount(id).then(() => {
            if (String(user?.id) === id) {
              void logout().then(() => router.replace('/login'));
            } else {
              void refetch();
            }
          });
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.scroll} {...chromeScrollProps}>
      <Text style={styles.title}>Аккаунты</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {accounts.map((account, index) => (
        <AccountRow
          key={account.id}
          label={account.nickname ?? account.email ?? account.id}
          isCurrent={String(user?.id) === account.id}
          preferredFocus={isTvUi() && index === 0}
          onPress={() => void onSwitch(account.id)}
          onRemove={() => onRemove(account.id, account.nickname ?? account.email ?? account.id)}
        />
      ))}
      <AccountRow
        label="Добавить аккаунт"
        preferredFocus={isTvUi() && accounts.length === 0}
        onPress={() => router.push({ pathname: '/login', params: { addAccount: '1' } })}
      />
    </ScrollView>
  );
}

function AccountRow({
  label,
  onPress,
  onRemove,
  isCurrent,
  preferredFocus,
}: {
  label: string;
  onPress: () => void;
  onRemove?: () => void;
  isCurrent?: boolean;
  preferredFocus?: boolean;
}) {
  return (
    <View style={styles.row}>
      <TvFocusable
        hasTVPreferredFocus={preferredFocus}
        contentEntry={preferredFocus}
        onPress={onPress}
        style={styles.rowMain}
        focusedStyle={styles.rowFocused}
      >
        <Text style={styles.rowLabel}>
          {label}
          {isCurrent ? ' · текущий' : ''}
        </Text>
      </TvFocusable>
      {onRemove ? (
        <TvFocusable onPress={onRemove} style={styles.removeBtn} focusedStyle={styles.removeFocused}>
          <Text style={styles.removeLabel}>Удалить</Text>
        </TvFocusable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xxl, gap: spacing.md },
  title: {
    color: colors.text,
    fontSize: isTvUi() ? 26 : 24,
    fontWeight: '700',
  },
  error: { color: colors.danger },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  rowMain: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowFocused: {
    borderColor: tvFocus.borderColor,
    backgroundColor: tvFocus.fill,
  },
  rowLabel: {
    color: colors.text,
    fontSize: isTvUi() ? 20 : 16,
    fontWeight: '600',
  },
  removeBtn: {
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: 'rgba(63,29,29,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.25)',
  },
  removeFocused: {
    borderColor: tvFocus.borderColor,
    backgroundColor: 'rgba(127,29,29,0.55)',
  },
  removeLabel: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: isTvUi() ? 16 : 14,
  },
});
