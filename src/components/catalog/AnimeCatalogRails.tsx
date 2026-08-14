import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { useDeferredMount } from '@/hooks/useDeferredMount';

import {
  fetchAnimeCategories,
  fetchAnimeList,
  fetchAnimeRecommendationFeed,
  type CatalogShowcase,
} from '@/api/catalog';
import { LazyCatalogRail } from '@/components/catalog/LazyCatalogRail';
import { PosterRail, type RailItem } from '@/components/catalog/PosterRail';
import {
  dedupeAnimeRailsByPath,
  isHomeExcludedAnimeRecommendationSection,
  resolveAnimeCustomSections,
  resolveEnabledRecommendationShowcaseIds,
  resolveRecommendationFeedSectionIds,
  resolveRegularAnimeShowcaseIds,
} from '@/lib/homeSettings';
import { recommendationRailSlots } from '@/lib/animeRecommendationSlots';
import type { ContinueWatchingDedupeKeys } from '@/lib/continueWatchingDedupe';
import { CATALOG_RAIL_PAGE_SIZE, TV_CATALOG_EAGER_RAILS } from '@/lib/catalogRailPage';
import { mapAnimeToRailItem } from '@/lib/poster';
import type { CatalogHomeConfig } from '@/types/homeConfig';

function AnimeRecommendationRailsInner({
  enabledShowcaseIds,
  showcases,
  onItemPress,
  forHome,
  continueWatchingDedupe,
  restorePath,
}: {
  enabledShowcaseIds: string[];
  showcases: CatalogShowcase[];
  onItemPress: (item: RailItem) => void;
  forHome: boolean;
  continueWatchingDedupe?: ContinueWatchingDedupeKeys;
  restorePath?: string;
}) {
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
    enabled: feedSectionIds.length > 0,
  });

  const preparedSections = useMemo(() => {
    const excludeAnimeIds = continueWatchingDedupe?.animeIds;
    return feedSections
      .filter((section) => !forHome || !isHomeExcludedAnimeRecommendationSection(section.id))
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
      });
  }, [feedSections, titleByShowcaseId, forHome, continueWatchingDedupe]);

  const slots = useMemo(
    () => recommendationRailSlots(feedSectionIds, preparedSections, isLoading),
    [feedSectionIds, preparedSections, isLoading],
  );

  if (!feedSectionIds.length) return null;

  return (
    <>
      {slots.map((slot, index) => (
        <LazyCatalogRail
          key={slot.id}
          eager={index < TV_CATALOG_EAGER_RAILS}
          homeLazy={forHome}
          sessionKey={forHome ? `home:anime:rec:${slot.id}` : undefined}
        >
          <PosterRail
            title={slot.section?.title ?? titleByShowcaseId.get(slot.id) ?? 'Рекомендации'}
            items={(slot.section?.items ?? []).map(mapAnimeToRailItem)}
            loading={slot.loading}
            onItemPress={onItemPress}
            restorePath={restorePath}
            restoreRailKey={`anime:rec:${slot.id}`}
            railFocusPriority={restorePath ? 10 + index : undefined}
          />
        </LazyCatalogRail>
      ))}
    </>
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
  return (
    <AnimeRecommendationRailsInner
      enabledShowcaseIds={enabledShowcaseIds}
      showcases={showcases}
      onItemPress={onItemPress}
      forHome={forHome}
      continueWatchingDedupe={continueWatchingDedupe}
      restorePath={restorePath}
    />
  );
}
function AnimeShowcaseRail({
  showcase,
  onItemPress,
  restorePath,
  railFocusPriority,
}: {
  showcase: CatalogShowcase;
  onItemPress: (item: RailItem) => void;
  restorePath?: string;
  railFocusPriority?: number;
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
      railFocusPriority={railFocusPriority}
    />
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
  const belowFoldReady = useDeferredMount(!forHome);
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

  const regularShowcases = useMemo(() => {
    const byId = new Map((animeCat?.showcases ?? []).map((showcase) => [showcase.id, showcase]));
    return regularShowcaseIds
      .map((id) => byId.get(id))
      .filter((showcase): showcase is CatalogShowcase => Boolean(showcase));
  }, [animeCat, regularShowcaseIds]);

  const customSections = useMemo(() => {
    const customSectionsRaw = resolveAnimeCustomSections(config);
    return dedupeAnimeRailsByPath(regularShowcases, customSectionsRaw).secondary;
  }, [regularShowcases, config]);

  const openAnime = (item: RailItem) => {
    router.push(`/anime/${item.id}`);
  };

  if (!forHome && !belowFoldReady) return null;

  if (isLoading && !regularShowcases.length && !recommendationShowcaseIds.length) {
    return <PosterRail title="Аниме" items={[]} loading onItemPress={() => {}} />;
  }

  if (!regularShowcases.length && !customSections.length && !recommendationShowcaseIds.length) {
    return null;
  }

  const recommendationRails = (
    <AnimeRecommendationRails
      enabledShowcaseIds={recommendationShowcaseIds}
      showcases={animeCat?.showcases ?? []}
      onItemPress={openAnime}
      forHome={forHome}
      continueWatchingDedupe={continueWatchingDedupe}
      restorePath={restorePath}
    />
  );

  return (
    <>
      {recommendationRails}
      {regularShowcases.map((showcase, index) => {
        const rail = (
          <AnimeShowcaseRail
            showcase={showcase}
            onItemPress={openAnime}
            restorePath={restorePath}
            railFocusPriority={restorePath ? 100 + index : undefined}
          />
        );
        if (forHome) {
          return (
            <LazyCatalogRail
              key={showcase.id}
              eager={index < TV_CATALOG_EAGER_RAILS}
              homeLazy
              sessionKey={`home:anime:${showcase.id}`}
            >
              {rail}
            </LazyCatalogRail>
          );
        }
        return (
          <LazyCatalogRail key={showcase.id} eager={index < TV_CATALOG_EAGER_RAILS}>
            {rail}
          </LazyCatalogRail>
        );
      })}
      {customSections.map((section, index) => {
        const showcase = { id: section.id, name: section.title, path: section.path };
        const rail = (
          <AnimeShowcaseRail
            showcase={showcase}
            onItemPress={openAnime}
            restorePath={restorePath}
            railFocusPriority={restorePath ? 200 + index : undefined}
          />
        );
        if (forHome) {
          return (
            <LazyCatalogRail key={section.id} homeLazy sessionKey={`home:anime:custom:${section.id}`}>
              {rail}
            </LazyCatalogRail>
          );
        }
        return (
          <LazyCatalogRail key={section.id}>{rail}</LazyCatalogRail>
        );
      })}
    </>
  );
}
