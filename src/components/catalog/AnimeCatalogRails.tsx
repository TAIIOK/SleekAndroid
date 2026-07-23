import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import {
  fetchAnimeCategories,
  fetchAnimeList,
  fetchAnimeRecommendationFeed,
  type CatalogShowcase,
} from '@/api/catalog';
import { LazyCatalogRail } from '@/components/catalog/LazyCatalogRail';
import { PosterRail, type RailItem } from '@/components/catalog/PosterRail';
import { useNearViewport } from '@/hooks/useNearViewport';
import {
  dedupeAnimeRailsByPath,
  isHomeExcludedAnimeRecommendationSection,
  resolveAnimeCustomSections,
  resolveEnabledRecommendationShowcaseIds,
  resolveRecommendationFeedSectionIds,
  resolveRegularAnimeShowcaseIds,
} from '@/lib/homeSettings';
import type { ContinueWatchingDedupeKeys } from '@/lib/continueWatchingDedupe';
import { estimateCatalogRailHeight } from '@/lib/catalogRailLayout';
import { CATALOG_RAIL_PAGE_SIZE } from '@/lib/catalogRailPage';
import { mapAnimeToRailItem } from '@/lib/poster';
import type { CatalogHomeConfig } from '@/types/homeConfig';

function AnimeShowcaseRail({
  showcase,
  onItemPress,
  restorePath,
}: {
  showcase: CatalogShowcase;
  onItemPress: (item: RailItem) => void;
  restorePath?: string;
}) {
  const pageSize = CATALOG_RAIL_PAGE_SIZE;
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['anime-list', showcase.path, pageSize],
    queryFn: ({ pageParam }) => fetchAnimeList(showcase.path, pageParam, pageSize),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < pageSize) return undefined;
      return allPages.length + 1;
    },
  });

  const items = useMemo(
    () => (data?.pages ?? []).flatMap((page) => page.map(mapAnimeToRailItem)),
    [data],
  );

  return (
    <PosterRail
      title={showcase.name}
      items={items}
      loading={isLoading}
      onItemPress={onItemPress}
      errorMessage={isError ? (error as Error).message : undefined}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={() => {
        void fetchNextPage();
      }}
      restorePath={restorePath}
      restoreRailKey={`anime:${showcase.id}`}
    />
  );
}

function AnimeRecommendationRails({
  enabledShowcaseIds,
  showcases,
  onItemPress,
  forHome = false,
  continueWatchingDedupe,
  restorePath,
}: {
  enabledShowcaseIds: string[];
  showcases: CatalogShowcase[];
  onItemPress: (item: RailItem) => void;
  forHome?: boolean;
  continueWatchingDedupe?: ContinueWatchingDedupeKeys;
  restorePath?: string;
}) {
  const { ref, active, onLayoutCheck } = useNearViewport();
  const feedSectionIds = useMemo(
    () => resolveRecommendationFeedSectionIds(enabledShowcaseIds),
    [enabledShowcaseIds],
  );

  const titleByShowcaseId = useMemo(
    () => new Map(showcases.map((showcase) => [showcase.id, showcase.name])),
    [showcases],
  );

  const pageSize = CATALOG_RAIL_PAGE_SIZE;
  const { data: feedSections = [], isLoading } = useQuery({
    queryKey: ['anime-recommendations-feed', feedSectionIds.join(','), pageSize],
    queryFn: () => fetchAnimeRecommendationFeed(pageSize),
    enabled: active && feedSectionIds.length > 0,
  });

  const visibleSections = useMemo(() => {
    const allowed = new Set(feedSectionIds);
    const seen = new Set<string>();
    const excludeAnimeIds = continueWatchingDedupe?.animeIds;
    return feedSections
      .filter((section) => allowed.has(section.id) && section.items.length > 0)
      .filter((section) => !forHome || !isHomeExcludedAnimeRecommendationSection(section.id))
      .filter((section) => {
        if (seen.has(section.id)) return false;
        seen.add(section.id);
        return true;
      })
      .map((section) => {
        const items =
          forHome && excludeAnimeIds?.size
            ? section.items.filter((item) => !excludeAnimeIds.has(item.id))
            : section.items;
        return {
          ...section,
          title: titleByShowcaseId.get(section.id) ?? section.title,
          items,
        };
      })
      .filter((section) => section.items.length > 0);
  }, [feedSections, feedSectionIds, titleByShowcaseId, forHome, continueWatchingDedupe]);

  if (!feedSectionIds.length) return null;

  if (!active) {
    const placeholderRails = Math.min(Math.max(feedSectionIds.length, 1), 4);
    return (
      <View
        ref={ref}
        collapsable={false}
        onLayout={onLayoutCheck}
        style={{ minHeight: estimateCatalogRailHeight() * placeholderRails }}
      />
    );
  }

  return (
    <View ref={ref} collapsable={false} onLayout={onLayoutCheck}>
      {isLoading && !visibleSections.length ? (
        <PosterRail title="Рекомендации" items={[]} loading onItemPress={() => {}} />
      ) : null}
      {visibleSections.map((section) => (
        <LazyCatalogRail key={section.id}>
          <PosterRail
            title={section.title}
            items={section.items.map(mapAnimeToRailItem)}
            onItemPress={onItemPress}
            restorePath={restorePath}
            restoreRailKey={`anime:rec:${section.id}`}
          />
        </LazyCatalogRail>
      ))}
    </View>
  );
}

interface AnimeCatalogRailsProps {
  config: CatalogHomeConfig;
  forHome?: boolean;
  continueWatchingDedupe?: ContinueWatchingDedupeKeys;
  restorePath?: string;
}

export function AnimeCatalogRails({
  config,
  forHome = false,
  continueWatchingDedupe,
  restorePath,
}: AnimeCatalogRailsProps) {
  const router = useRouter();
  const { data: animeCat, isLoading } = useQuery({
    queryKey: ['anime-categories'],
    queryFn: fetchAnimeCategories,
  });

  const allShowcaseIds = useMemo(
    () => (animeCat?.showcases ?? []).map((showcase) => showcase.id),
    [animeCat],
  );

  const regularShowcaseIds = useMemo(
    () => resolveRegularAnimeShowcaseIds(config, allShowcaseIds),
    [config, allShowcaseIds],
  );

  const recommendationShowcaseIds = useMemo(
    () => resolveEnabledRecommendationShowcaseIds(config, allShowcaseIds, { forHome }),
    [config, allShowcaseIds, forHome],
  );

  const regularShowcases = useMemo(
    () => (animeCat?.showcases ?? []).filter((showcase) => regularShowcaseIds.includes(showcase.id)),
    [animeCat, regularShowcaseIds],
  );

  const customSections = useMemo(() => {
    const customSectionsRaw = resolveAnimeCustomSections(config);
    return dedupeAnimeRailsByPath(regularShowcases, customSectionsRaw).secondary;
  }, [regularShowcases, config]);

  const openAnime = (item: RailItem) => {
    router.push(`/anime/${item.id}`);
  };

  if (isLoading && !regularShowcases.length && !recommendationShowcaseIds.length) {
    return <PosterRail title="Аниме" items={[]} loading onItemPress={() => {}} />;
  }

  if (!regularShowcases.length && !customSections.length && !recommendationShowcaseIds.length) {
    return null;
  }

  return (
    <>
      <AnimeRecommendationRails
        enabledShowcaseIds={recommendationShowcaseIds}
        showcases={animeCat?.showcases ?? []}
        onItemPress={openAnime}
        forHome={forHome}
        continueWatchingDedupe={continueWatchingDedupe}
        restorePath={restorePath}
      />
      {regularShowcases.map((showcase) => (
        <LazyCatalogRail key={showcase.id}>
          <AnimeShowcaseRail
            showcase={showcase}
            onItemPress={openAnime}
            restorePath={restorePath}
          />
        </LazyCatalogRail>
      ))}
      {customSections.map((section) => (
        <LazyCatalogRail key={section.id}>
          <AnimeShowcaseRail
            showcase={{ id: section.id, name: section.title, path: section.path }}
            onItemPress={openAnime}
            restorePath={restorePath}
          />
        </LazyCatalogRail>
      ))}
    </>
  );
}
