import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getSavedAccounts, removeSavedAccount } from '@/lib/savedAccounts';
import { colors, spacing } from '@/constants/aniverse';
import { useAuth } from '@/providers/AuthProvider';

export default function AccountsScreen() {
  const router = useRouter();
  const { switchAccount, user, logout } = useAuth();
  const [error, setError] = useState<string | null>(null);

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
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Аккаунты</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {accounts.map((account) => (
        <AccountRow
          key={account.id}
          label={account.nickname ?? account.email ?? account.id}
          isCurrent={String(user?.id) === account.id}
          onPress={() => void onSwitch(account.id)}
          onRemove={() => onRemove(account.id, account.nickname ?? account.email ?? account.id)}
        />
      ))}
      <AccountRow
        label="Добавить аккаунт"
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
}: {
  label: string;
  onPress: () => void;
  onRemove?: () => void;
  isCurrent?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.row, focused && styles.rowFocused]}>
      <Pressable
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onPress={onPress}
        style={styles.rowMain}
      >
        <Text style={styles.rowLabel}>
          {label}
          {isCurrent ? ' · текущий' : ''}
        </Text>
      </Pressable>
      {onRemove ? (
        <Pressable onPress={onRemove} style={styles.removeBtn} hitSlop={8}>
          <Text style={styles.removeLabel}>Удалить</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xxl, gap: spacing.md },
  title: {
    color: colors.text,
    fontSize: Platform.isTV ? 26 : 24,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  row: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowFocused: {
    borderColor: colors.brandAccent,
    transform: [{ scale: 1.02 }],
  },
  rowMain: {
    flex: 1,
    padding: spacing.lg,
  },
  rowLabel: {
    color: colors.text,
    fontSize: Platform.isTV ? 22 : 16,
    fontWeight: '600',
  },
  removeBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  removeLabel: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  error: {
    color: colors.danger,
  },
});
