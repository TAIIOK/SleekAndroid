import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fetchCollections } from '@/api/collections';
import { fetchUserStats } from '@/api/user';
import { LibraryAnalyticsSection } from '@/components/library/LibraryAnalyticsSection';
import { LibraryHubChrome } from '@/components/library/LibraryHubChrome';
import { LibraryMediaFilters } from '@/components/library/LibraryMediaFilters';
import { MyListsContent } from '@/components/library/MyListsContent';
import { MyListsFilters } from '@/components/library/MyListsFilters';
import { colors, spacing } from '@/constants/aniverse';
import { useSavedLibrary } from '@/hooks/useSavedLibrary';
import { buildLibraryAnalytics } from '@/lib/libraryAnalytics';
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
import { tvVerticalCatalogScrollProps } from '@/lib/tvCatalogScroll';
import { isTvUi } from '@/lib/isTvUi';
import { useMobileChromeScrollProps } from '@/providers/MobileChromeScroll';

export default function MyListsScreen() {
  const [media, setMedia] = useState<MyListsMediaFilter>('all');
  const [status, setStatus] = useState<MyListsStatusFilter>('all');
  const { savedAnime, savedLampa, isLoading, isError } = useSavedLibrary();
  const chromeScrollProps = useMobileChromeScrollProps(undefined, styles.content);

  const { data: collections = [] } = useQuery({
    queryKey: ['collections'],
    queryFn: fetchCollections,
  });
  const { data: userStats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: fetchUserStats,
  });

  const stats = useMemo(
    () => ({
      anime: savedAnime.filter((item) => hasListStatus(item.status)).length,
      movie: savedLampa.filter((row) => {
        const entry = row as Record<string, unknown>;
        return getLampaMediaBucket(entry) === 'movie' && hasLampaListStatus(entry);
      }).length,
      tv: savedLampa.filter((row) => {
        const entry = row as Record<string, unknown>;
        return getLampaMediaBucket(entry) === 'tv' && hasLampaListStatus(entry);
      }).length,
    }),
    [savedAnime, savedLampa],
  );

  const libraryTotal = useMemo(
    () =>
      savedAnime.filter((item) => hasListStatus(item.status)).length +
      savedLampa.filter((row) => hasLampaListStatus(row as Record<string, unknown>)).length,
    [savedAnime, savedLampa],
  );

  const analytics = useMemo(
    () =>
      buildLibraryAnalytics(
        savedAnime,
        savedLampa,
        media,
        collections.length,
        userStats,
      ),
    [savedAnime, savedLampa, media, collections.length, userStats],
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
    return (savedLampa as Array<Record<string, unknown>>).filter((row) => {
      if (!hasLampaListStatus(row)) return false;
      if (!lampaMatchesMediaFilter(row, media)) return false;
      if (status === 'all') return true;
      return normalizeListStatus(getSavedLampaUserStatus(row)) === status;
    });
  }, [savedLampa, media, status]);

  const groupByStatus = status === 'all';

  return (
    <ScrollView
      style={styles.scroll}
      showsVerticalScrollIndicator={false}
      {...chromeScrollProps}
      {...tvVerticalCatalogScrollProps}
    >
      <LibraryHubChrome />
      <LibraryMediaFilters media={media} onMediaChange={setMedia} counts={stats} />

      <View style={styles.pad}>
        <LibraryAnalyticsSection analytics={analytics} />
      </View>

      <MyListsFilters status={status} onStatusChange={setStatus} />

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : isError ? (
        <Text style={styles.empty}>Не удалось загрузить списки. Попробуйте обновить страницу.</Text>
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
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: isTvUi() ? spacing.xxl * 2 : spacing.xl,
    gap: spacing.lg,
    flexGrow: 1,
  },
  pad: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  loader: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  empty: {
    color: colors.textSecondary,
    fontSize: 15,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
});
