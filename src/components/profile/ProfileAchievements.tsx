import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { ProfileSection } from '@/components/profile/ProfileSection';
import { colors, radii, spacing } from '@/constants/aniverse';
import { resolvePosterUrl } from '@/lib/config';
import type { AchievementsData } from '@/types/profile';

interface ProfileAchievementsProps {
  data: AchievementsData | null | undefined;
  loading?: boolean;
}

export function ProfileAchievements({ data, loading }: ProfileAchievementsProps) {
  const [expanded, setExpanded] = useState(false);

  const { unlocked, total, preview, allUnlocked } = useMemo(() => {
    const state = data?.state ?? [];
    const unlockedItems = state
      .filter((item) => item.isUnlocked)
      .sort((a, b) => {
        const aTime = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
        const bTime = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
        return bTime - aTime;
      });
    const totalCount = state.length || data?.catalog?.length || 0;
    return {
      unlocked: unlockedItems.length,
      total: totalCount,
      preview: unlockedItems.slice(0, 6),
      allUnlocked: unlockedItems,
    };
  }, [data]);

  const list = expanded ? allUnlocked : preview;

  return (
    <ProfileSection
      title="Достижения"
      action={
        <View style={styles.headerActions}>
          {!loading && total > 0 ? (
            <Text style={styles.counter}>
              Открыто {unlocked}/{total}
            </Text>
          ) : null}
          {allUnlocked.length > 6 ? (
            <Pressable onPress={() => setExpanded((value) => !value)}>
              <Text style={styles.expand}>
                {expanded ? 'Свернуть' : 'Все достижения'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      }
    >
      {loading ? (
        <Text style={styles.muted}>Загрузка…</Text>
      ) : list.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Пока нет достижений</Text>
          <Text style={styles.muted}>
            Смотрите аниме и читайте мангу — достижения откроются автоматически
          </Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {list.map((item) => {
            const achievement = item.achievement;
            return (
              <View key={item.id ?? item.achievementId} style={styles.card}>
                <View style={styles.iconWrap}>
                  <Text style={styles.icon}>{achievement?.icon ?? '🏆'}</Text>
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{achievement?.title ?? 'Достижение'}</Text>
                  {achievement?.description ? (
                    <Text style={styles.cardDesc} numberOfLines={2}>
                      {achievement.description}
                    </Text>
                  ) : null}
                  {item.tier != null && item.tier > 0 ? (
                    <Text style={styles.tier}>Уровень {item.tier}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ProfileSection>
  );
}

export function ProfileAvatar({
  nickname,
  avatar,
  size = 'md',
}: {
  nickname?: string;
  avatar?: string | { url?: string };
  size?: 'sm' | 'md';
}) {
  const uri = resolvePosterUrl(typeof avatar === 'string' ? avatar : avatar?.url);
  const dim = size === 'sm' ? 32 : 40;
  if (uri) {
    return <Image source={{ uri }} style={{ width: dim, height: dim, borderRadius: dim / 2 }} />;
  }
  return (
    <View style={[styles.avatarFallback, { width: dim, height: dim, borderRadius: dim / 2 }]}>
      <Text style={styles.avatarLetter}>{(nickname ?? '?').slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  counter: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  expand: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: '600',
  },
  muted: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
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
  grid: {
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    padding: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(195,192,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 15,
  },
  cardDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  tier: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  avatarFallback: {
    backgroundColor: colors.bgLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: colors.brand,
    fontWeight: '700',
    fontSize: 14,
  },
});
