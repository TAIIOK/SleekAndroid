import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fetchFriendsFeed, markFeedSeen } from '@/api/feed';
import { FriendAvatar } from '@/components/friends/FriendAvatar';
import { FriendsEmptyState } from '@/components/friends/FriendsEmptyState';
import { FriendsHubChrome } from '@/components/friends/FriendsHubChrome';
import { FriendsListSkeleton } from '@/components/friends/FriendsListSkeleton';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';
import { groupFeedByDate, toActivityDisplayItem } from '@/lib/activityFeedUtils';
import { isTvUi } from '@/lib/isTvUi';
import { useMobileChromeScrollProps } from '@/providers/MobileChromeScroll';
import type { ActivityFeedDisplayItem } from '@/types/activityFeed';
import { userProfilePath } from '@/types/userProfile';

function FeedActivityRow({ item }: { item: ActivityFeedDisplayItem }) {
  const router = useRouter();
  const actorName = item.actor.nickname ?? 'Пользователь';
  const openProfile = () => router.push(userProfilePath(item.actor) as '/');
  const openTarget = () => {
    if (item.to.startsWith('/')) router.push(item.to as '/');
  };

  const avatar = (
    <FriendAvatar
      avatar={item.actor.avatar}
      nickname={item.actor.nickname}
      size={36}
    />
  );
  const body = (
    <>
      <Text style={styles.meta} numberOfLines={1}>
        <Text style={styles.actorName}>{actorName}</Text>
        <Text style={styles.action}> · {item.actionLabel}</Text>
      </Text>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {item.title}
      </Text>
    </>
  );
  const poster = item.poster ? (
    <Image source={{ uri: item.poster }} style={styles.poster} />
  ) : null;

  if (isTvUi()) {
    return (
      <View style={styles.activityRow}>
        <TvFocusable
          onPress={openProfile}
          style={styles.actorPress}
          accessibilityLabel={`Профиль ${actorName}`}
        >
          {avatar}
        </TvFocusable>
        <TvFocusable onPress={openTarget} style={styles.activityTarget}>
          <View style={styles.activityBody}>{body}</View>
          {poster}
        </TvFocusable>
      </View>
    );
  }

  return (
    <View style={styles.activityRow}>
      <Pressable
        onPress={openProfile}
        style={styles.actorPress}
        accessibilityRole="button"
        accessibilityLabel={`Профиль ${actorName}`}
      >
        {avatar}
      </Pressable>
      <Pressable onPress={openTarget} style={styles.activityBody} accessibilityRole="button">
        {body}
      </Pressable>
      {poster ? (
        <Pressable onPress={openTarget} accessibilityRole="button">
          {poster}
        </Pressable>
      ) : null}
    </View>
  );
}

export default function FriendsFeedScreen() {
  const chromeScrollProps = useMobileChromeScrollProps(undefined, styles.content);

  const { data, isLoading } = useQuery({
    queryKey: ['friends-feed'],
    queryFn: () => fetchFriendsFeed({ limit: 40 }),
  });

  useEffect(() => {
    void markFeedSeen();
  }, []);

  const groups = useMemo(() => {
    const items = (data?.data ?? [])
      .map(toActivityDisplayItem)
      .filter((item): item is NonNullable<typeof item> => item != null);
    return groupFeedByDate(items);
  }, [data]);

  return (
    <ScrollView {...chromeScrollProps} style={styles.scroll}>
      <FriendsHubChrome />
      {isLoading ? <FriendsListSkeleton variant="feed" rows={4} /> : null}
      {!isLoading && groups.length === 0 ? (
        <FriendsEmptyState
          icon="sparkles-outline"
          title="Пока тихо"
          hint="Когда друзья будут смотреть и оценивать, активность появится здесь"
        />
      ) : null}

      {groups.map((group) => (
        <View key={group.key} style={styles.group}>
          <Text style={styles.groupLabel}>{group.label}</Text>
          {group.items.map((item) => (
            <FeedActivityRow key={item.id} item={item} />
          ))}
        </View>
      ))}
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
  group: { gap: 0 },
  groupLabel: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.sm,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  actorPress: { flexShrink: 0 },
  activityTarget: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  activityBody: { flex: 1, minWidth: 0, gap: 4 },
  meta: { color: colors.textSecondary, fontSize: 13 },
  actorName: { color: colors.text, fontWeight: '700' },
  action: { color: colors.textSecondary, fontWeight: '500' },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '600', lineHeight: 20 },
  poster: { width: 48, height: 72, borderRadius: radii.md, backgroundColor: colors.bgCard },
});
