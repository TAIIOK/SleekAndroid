import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { mapPublicLibraryAnime, mapPublicLibraryLampa } from '@/api/library';
import {
  fetchUserBrief,
  fetchUserLibraryAnimeRaw,
  fetchUserLibraryLampaRaw,
} from '@/api/userProfile';
import { FriendsEmptyState } from '@/components/friends/FriendsEmptyState';
import { UserProfileHeader } from '@/components/friends/UserProfileHeader';
import { LibraryMediaFilters } from '@/components/library/LibraryMediaFilters';
import { MyListsContent } from '@/components/library/MyListsContent';
import { MyListsFilters } from '@/components/library/MyListsFilters';
import { colors, spacing } from '@/constants/aniverse';
import {
  getLampaMediaBucket,
  getSavedLampaUserStatus,
  hasListStatus,
  hasLampaListStatus,
  lampaMatchesMediaFilter,
  normalizeListStatus,
  type MyListsMediaFilter,
  type MyListsStatusFilter,
} from '@/lib/myLists';
import { canViewProfileSection, profileSectionMessage } from '@/lib/profileVisibility';
import { useMobileChromeScrollProps } from '@/providers/MobileChromeScroll';

export default function UserProfileListsScreen() {
  const { userRef } = useLocalSearchParams<{ userRef: string }>();
  const ref = String(userRef ?? '');
  const [media, setMedia] = useState<MyListsMediaFilter>('all');
  const [status, setStatus] = useState<MyListsStatusFilter>('all');
  const chromeScrollProps = useMobileChromeScrollProps(undefined, styles.content);

  const { data: profile } = useQuery({
    queryKey: ['user-brief', ref],
    queryFn: () => fetchUserBrief(ref),
    enabled: !!ref,
  });

  const userId = profile?.id ?? ref;
  const allowed = profile ? canViewProfileSection(profile, 'library') : false;

  const animeQuery = useQuery({
    queryKey: ['user-library-anime', userId],
    queryFn: async () => {
      const raw = await fetchUserLibraryAnimeRaw(userId, { include: 'anime' });
      return mapPublicLibraryAnime(raw);
    },
    enabled: allowed,
  });

  const lampaQuery = useQuery({
    queryKey: ['user-library-lampa', userId],
    queryFn: async () => {
      const raw = await fetchUserLibraryLampaRaw(userId, { include: 'lampa' });
      return mapPublicLibraryLampa(raw);
    },
    enabled: allowed,
  });

  const savedAnime = animeQuery.data ?? [];
  const savedLampa = lampaQuery.data ?? [];
  const isLoading = animeQuery.isLoading || lampaQuery.isLoading;

  const stats = useMemo(
    () => ({
      anime: savedAnime.filter((item) => hasListStatus(item.status)).length,
      movie: savedLampa.filter(
        (row) => getLampaMediaBucket(row) === 'movie' && hasLampaListStatus(row),
      ).length,
      tv: savedLampa.filter(
        (row) => getLampaMediaBucket(row) === 'tv' && hasLampaListStatus(row),
      ).length,
    }),
    [savedAnime, savedLampa],
  );

  const libraryTotal = useMemo(
    () =>
      savedAnime.filter((item) => hasListStatus(item.status)).length +
      savedLampa.filter((row) => hasLampaListStatus(row)).length,
    [savedAnime, savedLampa],
  );

  const filteredAnime = useMemo(() => {
    if (media !== 'all' && media !== 'anime') return [];
    return savedAnime.filter((item) => {
      if (!hasListStatus(item.status)) return false;
      if (status === 'all') return true;
      return normalizeListStatus(item.status) === status;
    });
  }, [savedAnime, media, status]);

  const filteredLampa = useMemo(() => {
    if (media === 'anime') return [] as Array<Record<string, unknown>>;
    return savedLampa.filter((row) => {
      if (!hasLampaListStatus(row)) return false;
      if (!lampaMatchesMediaFilter(row, media)) return false;
      if (status === 'all') return true;
      return normalizeListStatus(getSavedLampaUserStatus(row)) === status;
    });
  }, [savedLampa, media, status]);

  const groupByStatus = status === 'all';

  if (profile && !allowed) {
    return (
      <ScrollView {...chromeScrollProps} style={styles.scroll}>
        <View style={styles.headerPad}>
          <UserProfileHeader />
        </View>
        <FriendsEmptyState
          icon="lock-closed-outline"
          title="Списки скрыты"
          hint={profileSectionMessage(profile, 'library')}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      {...chromeScrollProps}
      style={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerPad}>
        <UserProfileHeader />
      </View>
      <LibraryMediaFilters media={media} onMediaChange={setMedia} counts={stats} />
      <MyListsFilters status={status} onStatusChange={setStatus} />

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : libraryTotal === 0 ? (
        <FriendsEmptyState
          icon="albums-outline"
          title="Списки пока пусты"
          hint="Когда пользователь добавит тайтлы в списки, они появятся здесь"
        />
      ) : (
        <MyListsContent
          media={media}
          anime={filteredAnime}
          lampa={filteredLampa}
          statusFilter={status}
          groupByStatus={groupByStatus}
          libraryTotal={libraryTotal}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl + spacing.lg,
    gap: spacing.md,
  },
  headerPad: {
    paddingHorizontal: spacing.lg,
  },
  loader: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
});
