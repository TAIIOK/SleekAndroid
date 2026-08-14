import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { fetchFriendships, removeFriend } from '@/api/friends';
import { AddFriendPanel } from '@/components/friends/AddFriendPanel';
import { FriendsEmptyState } from '@/components/friends/FriendsEmptyState';
import { FriendsHubChrome } from '@/components/friends/FriendsHubChrome';
import { FriendsListSkeleton } from '@/components/friends/FriendsListSkeleton';
import { FriendUserRow } from '@/components/friends/FriendUserRow';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, spacing } from '@/constants/aniverse';
import { useMobileChromeScrollProps } from '@/providers/MobileChromeScroll';
import { isAcceptedFriendship } from '@/types/friends';
import { userProfilePath } from '@/types/userProfile';

export default function FriendsListScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const chromeScrollProps = useMobileChromeScrollProps(undefined, styles.content);

  const { data = [], isLoading } = useQuery({
    queryKey: ['friendships'],
    queryFn: fetchFriendships,
  });

  const friends = useMemo(
    () => data.filter(isAcceptedFriendship),
    [data],
  );

  const remove = useMutation({
    mutationFn: (friendId: string) => removeFriend(friendId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['friendships'] });
    },
  });

  return (
    <ScrollView {...chromeScrollProps} style={styles.scroll}>
      <FriendsHubChrome />
      <AddFriendPanel />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Ваши друзья{!isLoading && friends.length > 0 ? ` · ${friends.length}` : ''}
        </Text>

        {isLoading ? <FriendsListSkeleton rows={3} /> : null}

        {!isLoading && friends.length === 0 ? (
          <FriendsEmptyState
            icon="people-outline"
            title="Список друзей пуст"
            hint="Найдите друга по никнейму выше"
          />
        ) : null}

        {!isLoading
          ? friends.map((friendship) => {
              const user = friendship.user;
              return (
                <FriendUserRow
                  key={friendship.id}
                  userId={user.id}
                  nickname={user.nickname}
                  avatar={user.avatar}
                  isOnline={user.isOnline}
                  onPress={() => router.push(userProfilePath(user) as '/')}
                  actions={
                    <TvFocusable
                      onPress={() => remove.mutate(user.id)}
                      style={styles.removeBtn}
                      disabled={remove.isPending}
                    >
                      <Text style={styles.removeLabel}>Удалить</Text>
                    </TvFocusable>
                  }
                />
              );
            })
          : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  section: { gap: 0 },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  removeBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  removeLabel: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
});
