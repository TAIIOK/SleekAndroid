import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { sendFriendInvite } from '@/api/friends';
import {
  fetchPublicUserStats,
  fetchUserBrief,
  fetchUserMutualFriends,
  fetchUserTasteCompatibility,
  fetchUserWatchingNow,
} from '@/api/userProfile';
import { UserProfileHeader } from '@/components/friends/UserProfileHeader';
import { ProfileStatsGrid } from '@/components/profile/ProfileStatsGrid';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';
import {
  canViewProfileSection,
  isProfileBlocked,
  profileSectionMessage,
} from '@/lib/profileVisibility';
import { useMobileChromeScrollProps } from '@/providers/MobileChromeScroll';
import { userProfilePath } from '@/types/userProfile';

export default function UserProfileOverviewScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userRef } = useLocalSearchParams<{ userRef: string }>();
  const ref = String(userRef ?? '');
  const chromeScrollProps = useMobileChromeScrollProps(undefined, styles.content);

  const { data: profile } = useQuery({
    queryKey: ['user-brief', ref],
    queryFn: () => fetchUserBrief(ref),
    enabled: !!ref,
  });

  const userId = profile?.id ?? ref;

  const { data: stats } = useQuery({
    queryKey: ['user-stats', userId],
    queryFn: () => fetchPublicUserStats(userId),
    enabled: !!profile && canViewProfileSection(profile, 'stats'),
  });

  const { data: watchingNow } = useQuery({
    queryKey: ['user-watching-now', userId],
    queryFn: () => fetchUserWatchingNow(userId),
    enabled: !!profile && canViewProfileSection(profile, 'watchingNow'),
  });

  const { data: taste } = useQuery({
    queryKey: ['user-taste', userId],
    queryFn: () => fetchUserTasteCompatibility(userId),
    enabled: !!profile && profile.friendshipStatus === 'accepted',
  });

  const { data: mutual = [] } = useQuery({
    queryKey: ['user-mutual', userId],
    queryFn: () => fetchUserMutualFriends(userId),
    enabled: !!profile && profile.friendshipStatus === 'accepted',
  });

  const invite = useMutation({
    mutationFn: () => sendFriendInvite(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['user-brief', ref] });
      void queryClient.invalidateQueries({ queryKey: ['friendships'] });
    },
  });

  if (!profile) {
    return (
      <ScrollView {...chromeScrollProps} style={styles.scroll}>
        <UserProfileHeader />
        <Text style={styles.muted}>Профиль не найден</Text>
      </ScrollView>
    );
  }

  if (isProfileBlocked(profile)) {
    return (
      <ScrollView {...chromeScrollProps} style={styles.scroll}>
        <UserProfileHeader />
        <Text style={styles.muted}>Профиль недоступен</Text>
      </ScrollView>
    );
  }

  const status = profile.friendshipStatus ?? 'none';

  return (
    <ScrollView {...chromeScrollProps} style={styles.scroll}>
      <UserProfileHeader />
      {status === 'none' || status === 'pending_outgoing' || status === 'pending_incoming' ? (
        <TvFocusable
          disabled={invite.isPending || status === 'pending_outgoing'}
          onPress={() => invite.mutate()}
          style={styles.friendBtn}
        >
          <Text style={styles.friendBtnLabel}>
            {status === 'pending_outgoing'
              ? 'Заявка отправлена'
              : status === 'pending_incoming'
                ? 'Ответьте во вкладке Заявки'
                : 'Добавить в друзья'}
          </Text>
        </TvFocusable>
      ) : null}

      {canViewProfileSection(profile, 'stats') ? (
        <ProfileStatsGrid stats={stats ?? {}} loading={!stats} />
      ) : (
        <Text style={styles.muted}>{profileSectionMessage(profile, 'stats')}</Text>
      )}

      {canViewProfileSection(profile, 'watchingNow') && watchingNow ? (
        <TvFocusable
          onPress={() => {
            if (watchingNow.to?.startsWith('/')) router.push(watchingNow.to as '/');
          }}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>Сейчас смотрит</Text>
          <Text style={styles.cardBody}>{watchingNow.title ?? 'Без названия'}</Text>
        </TvFocusable>
      ) : null}

      {taste ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Совместимость вкусов</Text>
          <Text style={styles.cardBody}>
            {Math.round(taste.compatibilityPercent ?? (taste.compatibility ?? 0) * 100)}%
          </Text>
        </View>
      ) : null}

      {mutual.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Общие друзья</Text>
          {mutual.slice(0, 6).map((friend) => (
            <TvFocusable
              key={friend.id}
              onPress={() => router.push(userProfilePath(friend) as '/')}
            >
              <Text style={styles.cardBody}>{friend.nickname ?? friend.id}</Text>
            </TvFocusable>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl + spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  muted: { color: colors.textSecondary },
  friendBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.brand,
  },
  friendBtnLabel: { color: '#fff', fontWeight: '700' },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: { color: colors.text, fontWeight: '700' },
  cardBody: { color: colors.textSecondary },
});
