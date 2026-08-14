import { StyleSheet, Text, TextInput, View } from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';

export function PartyJoinCodeCard({
  value,
  onChangeText,
  joining,
  onJoin,
}: {
  value: string;
  onChangeText: (value: string) => void;
  joining?: boolean;
  onJoin: () => void;
}) {
  const canJoin = value.trim().length > 0 && !joining;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Код комнаты</Text>
      <View style={styles.row}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Введите код"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.input}
          onSubmitEditing={() => {
            if (canJoin) onJoin();
          }}
        />
        <TvFocusable disabled={!canJoin} onPress={onJoin} style={[styles.btn, !canJoin && styles.btnDisabled]}>
          <Text style={styles.btnLabel}>{joining ? '…' : 'Войти'}</Text>
        </TvFocusable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  label: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    backgroundColor: colors.bgLow,
    fontSize: 16,
    letterSpacing: 1,
  },
  btn: {
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandAccent,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnLabel: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
});
