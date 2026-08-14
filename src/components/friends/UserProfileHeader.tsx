import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image, StyleSheet, Text, View } from 'react-native';

import { fetchUserBrief } from '@/api/userProfile';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';
import { resolvePosterUrl } from '@/lib/config';
import {
  canViewProfileSection,
  isProfileBlocked,
  profileRestrictionHint,
} from '@/lib/profileVisibility';
import { resolveAvatarUrl } from '@/lib/profileAvatar';
import {
  USER_PROFILE_TABS,
  userProfileTabFromPath,
  userProfileTabPath,
  type UserProfileTab,
} from '@/types/userProfile';

/** Scrolls with page body — not fixed under app nav. */
export function UserProfileHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { userRef } = useLocalSearchParams<{ userRef: string }>();
  const ref = String(userRef ?? '');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-brief', ref],
    queryFn: () => fetchUserBrief(ref),
    enabled: !!ref,
  });

  const basePath = `/users/${encodeURIComponent(ref)}`;
  const activeTab = userProfileTabFromPath(pathname, basePath);
  const avatar = resolvePosterUrl(resolveAvatarUrl(profile?.avatar));
  const blocked = profile ? isProfileBlocked(profile) : false;
  const hint = profileRestrictionHint(profile?.friendshipStatus);

  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarLetter}>
              {(profile?.nickname ?? '?').slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.heroText}>
          <Text style={styles.nickname}>
            {isLoading ? 'Загрузка…' : profile?.nickname ?? ref}
          </Text>
          {profile?.isOnline ? <Text style={styles.online}>онлайн</Text> : null}
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
      </View>

      {!blocked && profile ? (
        <View style={styles.tabs}>
          {USER_PROFILE_TABS.filter((tab) => {
            if (tab.id === 'lists') return canViewProfileSection(profile, 'library');
            if (tab.id === 'activity') return canViewProfileSection(profile, 'activity');
            if (tab.id === 'friends') return canViewProfileSection(profile, 'friendsList');
            return true;
          }).map((tab, index) => {
            const active = activeTab === tab.id;
            return (
              <TvFocusable
                key={tab.id}
                onPress={() =>
                  router.push(userProfileTabPath(profile, tab.id as UserProfileTab) as '/')
                }
                style={[styles.tab, active && styles.tabActive]}
                focusedStyle={styles.tabFocused}
                hasTVPreferredFocus={active}
                railStart={index === 0}
                contentEntry={active}
              >
                <Text
                  style={[styles.tabLabel, active && styles.tabLabelActive]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TvFocusable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg, marginBottom: spacing.md },
  hero: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'center',
  },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  avatarLetter: { color: colors.text, fontSize: 22, fontWeight: '800' },
  heroText: { flex: 1, gap: 4 },
  nickname: { color: colors.text, fontSize: 22, fontWeight: '800' },
  online: { color: colors.brand, fontSize: 13 },
  hint: { color: colors.textSecondary, fontSize: 12 },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'stretch',
    gap: 6,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    borderColor: colors.brand,
    backgroundColor: 'rgba(79,70,229,0.25)',
  },
  tabFocused: {
    borderColor: '#ffffff',
  },
  tabLabel: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
  },
  tabLabelActive: { color: colors.text },
});
