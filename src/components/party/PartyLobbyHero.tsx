import { StyleSheet, Text, View } from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';
import { isTvUi } from '@/lib/isTvUi';

export function PartyLobbyHero({
  viewersOnline,
  activeRooms,
  creating,
  onCreate,
  tvEntry = true,
}: {
  viewersOnline?: number;
  activeRooms?: number;
  creating?: boolean;
  onCreate: () => void;
  /** Landing focus from the TV sidebar. Off when this screen is covered. */
  tvEntry?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Совместный просмотр</Text>
      <Text style={styles.subtitle}>Смотрите вместе с друзьями в одной комнате</Text>

      {(viewersOnline != null || activeRooms != null) && (
        <View style={styles.stats}>
          {viewersOnline != null ? (
            <View style={styles.pill}>
              <Text style={styles.pillLabel}>Онлайн {viewersOnline}</Text>
            </View>
          ) : null}
          {activeRooms != null ? (
            <View style={styles.pill}>
              <Text style={styles.pillLabel}>Комнат {activeRooms}</Text>
            </View>
          ) : null}
        </View>
      )}

      <TvFocusable
        disabled={creating}
        onPress={onCreate}
        style={styles.primary}
        hasTVPreferredFocus={isTvUi() && tvEntry}
        railStart={tvEntry}
        contentEntry={tvEntry}
      >
        <Text style={styles.primaryLabel}>
          {creating ? 'Создание…' : 'Создать комнату'}
        </Text>
      </TvFocusable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 16,
    textAlign: 'center',
    includeFontPadding: false,
  },
  primary: {
    marginTop: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radii.md,
    backgroundColor: colors.brandAccent,
  },
  primaryLabel: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
});
