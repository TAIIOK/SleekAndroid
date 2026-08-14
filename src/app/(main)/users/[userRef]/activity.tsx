import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { fetchUserActivities, fetchUserBrief } from '@/api/userProfile';
import { UserProfileHeader } from '@/components/friends/UserProfileHeader';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';
import { toActivityDisplayItem } from '@/lib/activityFeedUtils';
import { canViewProfileSection, profileSectionMessage } from '@/lib/profileVisibility';
import { useMobileChromeScrollProps } from '@/providers/MobileChromeScroll';

export default function UserProfileActivityScreen() {
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
  const allowed = profile ? canViewProfileSection(profile, 'activity') : false;

  const { data, isLoading } = useQuery({
    queryKey: ['user-activities', userId],
    queryFn: () => fetchUserActivities(userId, { limit: 40 }),
    enabled: allowed,
  });

  const items = useMemo(
    () =>
      (data?.data ?? [])
        .map(toActivityDisplayItem)
        .filter((item): item is NonNullable<typeof item> => item != null),
    [data],
  );

  if (profile && !allowed) {
    return (
      <ScrollView {...chromeScrollProps} style={styles.scroll}>
        <UserProfileHeader />
        <Text style={styles.muted}>{profileSectionMessage(profile, 'activity')}</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView {...chromeScrollProps} style={styles.scroll}>
      <UserProfileHeader />
      {isLoading ? <Text style={styles.muted}>Загрузка…</Text> : null}
      {!isLoading && items.length === 0 ? (
        <Text style={styles.muted}>Нет активности</Text>
      ) : null}
      {items.map((item) => (
        <TvFocusable
          key={item.id}
          onPress={() => {
            if (item.to.startsWith('/')) router.push(item.to as '/');
          }}
          style={styles.card}
        >
          <Text style={styles.action}>{item.actionLabel}</Text>
          <Text style={styles.title}>{item.title}</Text>
        </TvFocusable>
      ))}
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
  card: {
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    gap: 4,
  },
  action: { color: colors.textSecondary, fontSize: 13 },
  title: { color: colors.text, fontWeight: '600' },
});
