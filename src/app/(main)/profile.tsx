import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fetchAchievements, fetchFullProfile, fetchLeaderboard, fetchUserStats } from '@/api/user';
import { ProfileAchievements } from '@/components/profile/ProfileAchievements';
import { ProfileLeaderboard } from '@/components/profile/ProfileLeaderboard';
import { ProfileQuickLinks } from '@/components/profile/ProfileQuickLinks';
import { ProfileSettings } from '@/components/profile/ProfileSettings';
import { LogoutConfirm } from '@/components/profile/LogoutConfirm';
import { ProfileStatsGrid } from '@/components/profile/ProfileStatsGrid';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { getSavedAccounts } from '@/lib/savedAccounts';
import { colors, spacing, tvFocus } from '@/constants/aniverse';
import { resolvePosterUrl } from '@/lib/config';
import { useAuth } from '@/providers/AuthProvider';
import type { LeaderboardPeriod, LeaderboardType } from '@/types/profile';

function isPremiumSubscriber(
  profile: { boostySubscriptions?: { status?: string }[] } | null | undefined,
) {
  return !!profile?.boostySubscriptions?.some((s) => s.status === 'active');
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<LeaderboardPeriod>('week');
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>('watch');

  const { data: profile } = useQuery({
    queryKey: ['profile-full'],
    queryFn: fetchFullProfile,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['user-stats'],
    queryFn: fetchUserStats,
  });

  const { data: achievements, isLoading: achievementsLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn: fetchAchievements,
  });

  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery({
    queryKey: ['leaderboard', leaderboardPeriod, leaderboardType],
    queryFn: () => fetchLeaderboard(leaderboardPeriod, leaderboardType),
  });

  const { data: savedAccounts = [] } = useQuery({
    queryKey: ['saved-accounts'],
    queryFn: getSavedAccounts,
  });

  const nickname = profile?.nickname ?? user?.nickname ?? 'Пользователь';
  const email = profile?.email ?? user?.email;
  const avatarUrl = resolvePosterUrl(
    profile?.profileSettings?.avatarUrl ?? profile?.avatar ?? user?.avatar,
  );
  const premium = isPremiumSubscriber(profile);

  const runLogout = () => {
    setLoggingOut(true);
    void logout({ removeSaved: true })
      .then(() => router.replace('/login'))
      .finally(() => {
        setLoggingOut(false);
        setConfirmLogout(false);
      });
  };

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Профиль</Text>

        <View style={styles.card}>
          <View style={styles.headerRow}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarLetter}>{nickname.slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.headerText}>
              <Text style={styles.name}>{nickname}</Text>
              {email ? <Text style={styles.meta}>{email}</Text> : null}
              <Text style={[styles.badge, premium && styles.badgePremium]}>
                {premium ? 'Подписчик Boosty' : 'Не подписчик'}
              </Text>
            </View>
          </View>
        </View>

        <ProfileStatsGrid stats={stats} loading={statsLoading} />

        {!Platform.isTV ? (
          <>
            <ProfileLeaderboard
              entries={leaderboard?.data ?? []}
              loading={leaderboardLoading}
              period={leaderboardPeriod}
              type={leaderboardType}
              onPeriodChange={setLeaderboardPeriod}
              onTypeChange={setLeaderboardType}
            />
            <ProfileAchievements data={achievements} loading={achievementsLoading} />
            <ProfileQuickLinks />
          </>
        ) : null}

        <TvFocusable
          hasTVPreferredFocus={Platform.isTV}
          contentEntry={Platform.isTV}
          onPress={() => router.push('/accounts')}
          style={styles.button}
          focusedStyle={styles.buttonFocused}
        >
          <Text style={styles.buttonLabel}>Сменить аккаунт ({savedAccounts.length})</Text>
        </TvFocusable>

        <ProfileSettings onLogout={() => setConfirmLogout(true)} />
      </ScrollView>

      <LogoutConfirm
        visible={confirmLogout}
        loading={loggingOut}
        onConfirm={runLogout}
        onCancel={() => setConfirmLogout(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xxl, gap: spacing.lg },
  title: {
    color: colors.text,
    fontSize: Platform.isTV ? 26 : 24,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  headerRow: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: colors.bgLow,
  },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: colors.brand, fontSize: 28, fontWeight: '700' },
  headerText: { flex: 1, gap: spacing.xs },
  name: {
    color: colors.text,
    fontSize: Platform.isTV ? 28 : 20,
    fontWeight: '700',
  },
  meta: { color: colors.textSecondary, fontSize: 16 },
  badge: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.bgLow,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  badgePremium: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    color: '#fde68a',
  },
  button: {
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: spacing.lg,
  },
  buttonFocused: {
    borderColor: tvFocus.borderColor,
    backgroundColor: tvFocus.fill,
  },
  buttonLabel: {
    color: colors.text,
    fontSize: Platform.isTV ? 20 : 16,
    fontWeight: '600',
  },
});
