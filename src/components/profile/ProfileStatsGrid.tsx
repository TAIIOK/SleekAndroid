import { Platform, StyleSheet, Text, View } from 'react-native';

import type { UserStats } from '@/api/user';
import { colors, radii, spacing } from '@/constants/aniverse';

import { formatNumber, formatWatchTime } from '@/lib/format';

interface ProfileStatsGridProps {
  stats: UserStats | null | undefined;
  loading?: boolean;
}

export function ProfileStatsGrid({ stats, loading }: ProfileStatsGridProps) {
  if (loading) {
    return <Text style={styles.hint}>Загрузка статистики…</Text>;
  }
  if (!stats) {
    return <Text style={styles.hint}>Статистика обновится после активности</Text>;
  }

  const watchSeconds = stats.totalWatchSeconds ?? stats.activity?.totalWatchSeconds ?? 0;
  const readPages = stats.totalReadPages ?? stats.activity?.totalReadPages ?? 0;
  const achievements = stats.totalAchievements ?? stats.achievements?.total ?? 0;
  const ratings = stats.totalRatings ?? stats.social?.totalRatings ?? 0;
  const reviews = stats.totalReviews ?? stats.social?.totalReviews ?? 0;
  const friends = stats.totalFriends ?? 0;
  const streak = stats.history?.currentStreak ?? 0;

  const items = [
    { label: 'Просмотрено', value: formatWatchTime(watchSeconds) },
    { label: 'Прочитано', value: formatNumber(readPages) },
    { label: 'Достижения', value: formatNumber(achievements) },
    { label: 'Оценки', value: formatNumber(ratings) },
    { label: 'Отзывы', value: formatNumber(reviews) },
    { label: 'Друзья', value: formatNumber(friends) },
  ];

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Статистика</Text>
      <View style={styles.grid}>
        {items.map((item) => (
          <View key={item.label} style={styles.card}>
            <Text style={styles.value}>{item.value}</Text>
            <Text style={styles.label}>{item.label}</Text>
          </View>
        ))}
      </View>
      {streak > 0 ? (
        <Text style={styles.streak}>Серия: {formatNumber(streak)} дн.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  card: {
    width: Platform.isTV ? '30%' : '47%',
    minWidth: 140,
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  value: {
    color: colors.text,
    fontSize: Platform.isTV ? 28 : 22,
    fontWeight: '700',
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  streak: {
    color: colors.brand,
    fontSize: 14,
    fontWeight: '600',
  },
});
