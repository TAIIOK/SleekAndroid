import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fetchUserBrief, fetchUserFriends } from '@/api/userProfile';
import { UserProfileHeader } from '@/components/friends/UserProfileHeader';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';
import { resolvePosterUrl } from '@/lib/config';
import { canViewProfileSection, profileSectionMessage } from '@/lib/profileVisibility';
import { resolveAvatarUrl } from '@/lib/profileAvatar';
import { useMobileChromeScrollProps } from '@/providers/MobileChromeScroll';
import { isAcceptedFriendship } from '@/types/friends';
import { userProfilePath } from '@/types/userProfile';

export default function UserProfileFriendsScreen() {
  const router = useRouter();
  const { userRef } = useLocalSearchParams<{ userRef: string }>();
  const ref = String(userRef ?? '');
  const chromeScrollProps = useMobileChromeScrollProps(undefined, styles.content);

  const { data: profile } = useQuery({
    queryKey: ['user-brief', ref],
    queryFn: () => fetchUserBrief(ref),
    enabled: !!ref,
  });

  const userId = profile?.id ?? ref;
  const allowed = profile ? canViewProfileSection(profile, 'friendsList') : false;

  const { data = [], isLoading } = useQuery({
    queryKey: ['user-friends', userId],
    queryFn: () => fetchUserFriends(userId),
    enabled: allowed,
  });

  const friends = useMemo(() => data.filter(isAcceptedFriendship), [data]);

  if (profile && !allowed) {
    return (
      <ScrollView {...chromeScrollProps} style={styles.scroll}>
        <UserProfileHeader />
        <Text style={styles.muted}>{profileSectionMessage(profile, 'friendsList')}</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView {...chromeScrollProps} style={styles.scroll}>
      <UserProfileHeader />
      {isLoading ? <Text style={styles.muted}>Загрузка…</Text> : null}
      {!isLoading && friends.length === 0 ? (
        <Text style={styles.muted}>Список друзей пуст</Text>
      ) : null}
      {friends.map((friendship) => {
        const user = friendship.user;
        const avatar = resolvePosterUrl(resolveAvatarUrl(user.avatar));
        return (
          <TvFocusable
            key={friendship.id}
            onPress={() => router.push(userProfilePath(user) as '/')}
            style={styles.row}
          >
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarLetter}>
                  {(user.nickname ?? '?').slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.nickname}>{user.nickname ?? user.id}</Text>
          </TvFocusable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xxl + spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.bg,
  },
  muted: { color: colors.textSecondary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  avatarLetter: { color: colors.text, fontWeight: '700' },
  nickname: { color: colors.text, fontWeight: '700' },
});
