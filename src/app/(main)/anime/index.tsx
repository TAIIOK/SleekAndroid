import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Platform, ScrollView, StyleSheet } from 'react-native';

import { fetchAnimeList } from '@/api/catalog';
import { AnimeCatalogRails } from '@/components/catalog/AnimeCatalogRails';
import { LazyCatalogRail } from '@/components/catalog/LazyCatalogRail';
import { PosterRail } from '@/components/catalog/PosterRail';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useHomeCatalogConfig } from '@/hooks/useHomeCatalogConfig';
import { colors, spacing } from '@/constants/aniverse';
import { CATALOG_RAIL_PAGE_SIZE } from '@/lib/catalogRailPage';
import { mapAnimeToRailItem } from '@/lib/poster';
import { currentSeasonalShowcase } from '@/lib/seasonal';
import { tvVerticalCatalogScrollProps } from '@/lib/tvCatalogScroll';

export default function AnimeBrowseScreen() {
  const router = useRouter();
  const { config, ready } = useHomeCatalogConfig();
  const seasonal = useMemo(() => currentSeasonalShowcase(), []);
  const pageSize = CATALOG_RAIL_PAGE_SIZE;

  const {
    data: seasonalData,
    isLoading: seasonalLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['anime-seasonal', seasonal.path, pageSize],
    queryFn: ({ pageParam }) => fetchAnimeList(seasonal.path, pageParam, pageSize),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < pageSize) return undefined;
      return allPages.length + 1;
    },
  });

  const seasonalItems = useMemo(
    () => (seasonalData?.pages ?? []).flatMap((page) => page.map(mapAnimeToRailItem)),
    [seasonalData],
  );

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      {...tvVerticalCatalogScrollProps}
    >
      {Platform.isTV ? <SectionHeader title="Аниме" showAccent /> : null}
      <LazyCatalogRail>
        <PosterRail
          title={`Сезон · ${seasonal.name}`}
          items={seasonalItems}
          loading={seasonalLoading}
          onItemPress={(item) => router.push(`/anime/${item.id}`)}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={() => {
            void fetchNextPage();
          }}
        />
      </LazyCatalogRail>
      {ready ? <AnimeCatalogRails config={config} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
});
