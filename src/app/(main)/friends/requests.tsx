import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  acceptFriendInvite,
  fetchFriendships,
  rejectFriendInvite,
} from '@/api/friends';
import { FriendsEmptyState } from '@/components/friends/FriendsEmptyState';
import { FriendsHubChrome } from '@/components/friends/FriendsHubChrome';
import { FriendsListSkeleton } from '@/components/friends/FriendsListSkeleton';
import { FriendUserRow } from '@/components/friends/FriendUserRow';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';
import { useMobileChromeScrollProps } from '@/providers/MobileChromeScroll';
import {
  isIncomingRequest,
  isOutgoingRequest,
} from '@/types/friends';
import { userProfilePath } from '@/types/userProfile';

export default function FriendsRequestsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const chromeScrollProps = useMobileChromeScrollProps(undefined, styles.content);

  const { data = [], isLoading } = useQuery({
    queryKey: ['friendships'],
    queryFn: fetchFriendships,
  });

  const incoming = useMemo(() => data.filter(isIncomingRequest), [data]);
  const outgoing = useMemo(() => data.filter(isOutgoingRequest), [data]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['friendships'] });
  };

  const accept = useMutation({
    mutationFn: (friendId: string) => acceptFriendInvite(friendId),
    onSuccess: invalidate,
  });
  const reject = useMutation({
    mutationFn: (friendId: string) => rejectFriendInvite(friendId),
    onSuccess: invalidate,
  });

  const busy = accept.isPending || reject.isPending;

  return (
    <ScrollView {...chromeScrollProps} style={styles.scroll}>
      <FriendsHubChrome />
      {isLoading ? <FriendsListSkeleton rows={3} /> : null}

      {!isLoading ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Входящие{incoming.length > 0 ? ` · ${incoming.length}` : ''}
            </Text>
            {incoming.length === 0 ? (
              <FriendsEmptyState
                icon="mail-open-outline"
                title="Нет входящих заявок"
                hint="Когда вам отправят заявку в друзья, она появится здесь"
              />
            ) : (
              incoming.map((friendship) => {
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
                      <>
                        <TvFocusable
                          disabled={busy}
                          onPress={() => accept.mutate(user.id)}
                          style={styles.acceptBtn}
                        >
                          <Text style={styles.acceptLabel}>Принять</Text>
                        </TvFocusable>
                        <TvFocusable
                          disabled={busy}
                          onPress={() => reject.mutate(user.id)}
                          style={styles.ghostBtn}
                        >
                          <Text style={styles.ghostLabel}>Отклонить</Text>
                        </TvFocusable>
                      </>
                    }
                  />
                );
              })
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, styles.outgoingTitle]}>
              Исходящие{outgoing.length > 0 ? ` · ${outgoing.length}` : ''}
            </Text>
            {outgoing.length === 0 ? (
              <FriendsEmptyState
                icon="paper-plane-outline"
                title="Нет исходящих заявок"
                hint="Отправленные приглашения будут здесь, пока их не примут"
              />
            ) : (
              outgoing.map((friendship) => {
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
                        disabled={busy}
                        onPress={() => reject.mutate(user.id)}
                        style={styles.ghostBtn}
                      >
                        <Text style={styles.ghostLabel}>Отменить</Text>
                      </TvFocusable>
                    }
                  />
                );
              })
            )}
          </View>
        </>
      ) : null}
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
  outgoingTitle: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  acceptBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: colors.brandAccent,
  },
  acceptLabel: { color: colors.text, fontWeight: '600', fontSize: 13 },
  ghostBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  ghostLabel: { color: colors.textSecondary, fontWeight: '600', fontSize: 13 },
});
