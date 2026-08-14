import { useRouter, useSegments } from 'expo-router';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';

import { fetchFriendships } from '@/api/friends';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing, tvFocus } from '@/constants/aniverse';
import { FRIENDS_HUB_TITLE, friendsHubTabs } from '@/lib/friendsHub';
import { isTvUi } from '@/lib/isTvUi';
import { isIncomingRequest } from '@/types/friends';

function normalizePath(segments: string[]): string {
  const cleaned = segments.filter((segment) => !segment.startsWith('('));
  if (cleaned.length === 0) return '/';
  return `/${cleaned.join('/')}`;
}

/** Page-level Друзья title + hub tabs (normal layout flow, not overlay). */
export function FriendsHubChrome() {
  const router = useRouter();
  const segments = useSegments();
  const currentPath = normalizePath(segments as string[]);

  const { data: friendships = [] } = useQuery({
    queryKey: ['friendships'],
    queryFn: fetchFriendships,
  });

  const incomingCount = useMemo(
    () => friendships.filter(isIncomingRequest).length,
    [friendships],
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{FRIENDS_HUB_TITLE}</Text>
      <View style={styles.tabsRow}>
        {friendsHubTabs.map((tab, index) => {
          const active = currentPath === tab.to || currentPath.startsWith(`${tab.to}/`);
          const showBadge = tab.to === '/friends/requests' && incomingCount > 0;
          return (
            <TvFocusable
              key={tab.to}
              onPress={() => router.push(tab.to as '/')}
              style={[styles.tab, active && styles.tabActive]}
              focusedStyle={styles.tabFocused}
              hasTVPreferredFocus={active}
              railStart={index === 0}
              contentEntry={active}
            >
              <View style={styles.tabInner}>
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
                {showBadge ? (
                  <View style={[styles.badge, active && styles.badgeOnActive]}>
                    <Text style={styles.badgeLabel}>
                      {incomingCount > 99 ? '99+' : String(incomingCount)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </TvFocusable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: isTvUi() ? 26 : 28,
    fontWeight: '700',
  },
  tabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tab: {
    flexShrink: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: tvFocus.borderWidth,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.brandAccent,
    borderColor: colors.brandAccent,
  },
  tabFocused: {
    borderColor: '#ffffff',
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabLabel: {
    color: colors.textSecondary,
    fontSize: isTvUi() ? 16 : 14,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: colors.text,
  },
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
  },
  badgeOnActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  badgeLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
});
