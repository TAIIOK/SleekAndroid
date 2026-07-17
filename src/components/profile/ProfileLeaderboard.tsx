import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProfileAvatar } from '@/components/profile/ProfileAchievements';
import { ProfileSection } from '@/components/profile/ProfileSection';
import { colors, radii, spacing } from '@/constants/aniverse';
import { formatNumber, formatWatchTime } from '@/lib/format';
import type { LeaderboardEntry, LeaderboardPeriod, LeaderboardType } from '@/types/profile';

interface ProfileLeaderboardProps {
  entries: LeaderboardEntry[];
  loading?: boolean;
  period: LeaderboardPeriod;
  type: LeaderboardType;
  onPeriodChange: (period: LeaderboardPeriod) => void;
  onTypeChange: (type: LeaderboardType) => void;
}

function formatLeaderboardValue(value: number, type: LeaderboardType): string {
  if (type === 'watch') return formatWatchTime(value);
  return `${formatNumber(value)} стр.`;
}

function FilterPill<T extends string>({
  value,
  current,
  label,
  onChange,
}: {
  value: T;
  current: T;
  label: string;
  onChange: (value: T) => void;
}) {
  const active = value === current;
  return (
    <Pressable
      onPress={() => onChange(value)}
      style={[styles.pill, active && styles.pillActive]}
    >
      <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>{label}</Text>
    </Pressable>
  );
}

export function ProfileLeaderboard({
  entries,
  loading,
  period,
  type,
  onPeriodChange,
  onTypeChange,
}: ProfileLeaderboardProps) {
  const top = entries.slice(0, 10);

  return (
    <ProfileSection
      title="Лидерборд"
      action={
        <View style={styles.filters}>
          <FilterPill value="watch" current={type} label="Видео" onChange={onTypeChange} />
          <FilterPill value="read" current={type} label="Манга" onChange={onTypeChange} />
          <FilterPill value="week" current={period} label="Неделя" onChange={onPeriodChange} />
          <FilterPill value="month" current={period} label="Месяц" onChange={onPeriodChange} />
        </View>
      }
    >
      {loading ? (
        <Text style={styles.muted}>Загрузка…</Text>
      ) : top.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Пока пусто</Text>
          <Text style={styles.muted}>Здесь будет топ пользователей</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {top.map((entry, index) => {
            const user = entry.user;
            const rank = entry.rank ?? index + 1;
            const value = entry.value ?? 0;
            return (
              <View key={`${user?.id ?? rank}-${index}`} style={styles.row}>
                <Text style={styles.rank}>{rank}</Text>
                <ProfileAvatar nickname={user?.nickname} avatar={user?.avatar} size="sm" />
                <Text style={styles.name} numberOfLines={1}>
                  {user?.nickname ?? 'Пользователь'}
                </Text>
                <Text style={styles.value}>{formatLeaderboardValue(value, type)}</Text>
              </View>
            );
          })}
        </View>
      )}
    </ProfileSection>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  pillActive: {
    borderColor: colors.brand,
    backgroundColor: 'rgba(195,192,255,0.12)',
  },
  pillLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  pillLabelActive: {
    color: colors.brand,
  },
  muted: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  empty: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 15,
  },
  list: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rank: {
    width: 24,
    textAlign: 'center',
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 13,
  },
  name: {
    flex: 1,
    color: colors.text,
    fontWeight: '600',
    fontSize: 15,
  },
  value: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
