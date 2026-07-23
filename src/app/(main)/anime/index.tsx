import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  ScrollView,
  StyleSheet,
} from 'react-native';

import { fetchAnimeList } from '@/api/catalog';
import { AnimeCatalogRails } from '@/components/catalog/AnimeCatalogRails';
import { LazyCatalogRail } from '@/components/catalog/LazyCatalogRail';
import { PosterRail } from '@/components/catalog/PosterRail';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useHomeCatalogConfig } from '@/hooks/useHomeCatalogConfig';
import { useTvCatalogScrollRestore } from '@/hooks/useTvCatalogScrollRestore';
import { colors, spacing } from '@/constants/aniverse';
import { CATALOG_RAIL_PAGE_SIZE } from '@/lib/catalogRailPage';
import { mapAnimeToRailItem } from '@/lib/poster';
import { currentSeasonalShowcase } from '@/lib/seasonal';
import { tvVerticalCatalogScrollProps } from '@/lib/tvCatalogScroll';
import { isTvUi } from '@/lib/isTvUi';

export default function AnimeBrowseScreen() {
  const router = useRouter();
  const { config, ready } = useHomeCatalogConfig();
  const catalogScroll = useTvCatalogScrollRestore('/anime');
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
      ref={catalogScroll.scrollRef}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      onScroll={catalogScroll.onScroll}
      scrollEventThrottle={16}
      {...tvVerticalCatalogScrollProps}
    >
      {isTvUi() ? <SectionHeader title="Аниме" showAccent tvFocusEntry /> : null}
      <LazyCatalogRail eager={isTvUi()}>
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
          restorePath="/anime"
          restoreRailKey={`seasonal:${seasonal.path}`}
        />
      </LazyCatalogRail>
      {ready ? <AnimeCatalogRails config={config} restorePath="/anime" /> : null}
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
