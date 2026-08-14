import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/aniverse';

type FriendsEmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  hint: string;
};

export function FriendsEmptyState({ icon, title, hint }: FriendsEmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={22} color={colors.textMuted} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
