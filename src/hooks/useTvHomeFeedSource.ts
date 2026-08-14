import type { AnimeListItem } from '@aniverse/types';
import { findRecommendationSection } from '@aniverse/catalog';
import { useMemo } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import {
  fetchAnimeList,
  fetchAnimeRecommendationFeed,
  fetchLampaSectionItems,
  mapLampaToRailItem,
  type LampaItem,
} from '@/api/catalog';
import type { RailItem } from '@/components/catalog/PosterRail';
import { CATALOG_RAIL_PAGE_SIZE } from '@/lib/catalogRailPage';
import {
  resolveHideAsianLiveAction,
  shouldExcludeCjkFromLampaSection,
  type CatalogHomeConfig,
} from '@/lib/homeSettings';
import { mapAnimeToRailItem } from '@/lib/poster';
import { uniqueById } from '@/lib/searchConfig';
import { parseAnimeRecommendationSectionId } from '@/lib/animeRecommendationSource';
import type { TvHomeFeedSource } from '@/lib/tvHomeFeeds';

export function useTvHomeFeedSource(
  source: TvHomeFeedSource,
  config?: CatalogHomeConfig,
  options?: { enabled?: boolean },
) {
  const gate = options?.enabled ?? true;
  const pageSize = CATALOG_RAIL_PAGE_SIZE;
  const router = useRouter();
  const hideAsian = config ? resolveHideAsianLiveAction(config) : true;
  const excludeCjk = source.lampaSection
    ? shouldExcludeCjkFromLampaSection(source.lampaSection.endpoint, hideAsian)
    : false;
  const recommendationSectionId = parseAnimeRecommendationSectionId(source);
  const isRecommendationAnime = Boolean(recommendationSectionId);

  const recFeedQuery = useQuery({
    queryKey: ['anime-recommendations-feed', pageSize],
    queryFn: () => fetchAnimeRecommendationFeed(pageSize),
    enabled: gate && isRecommendationAnime,
    retry: 1,
  });

  const listQuery = useInfiniteQuery({
    queryKey:
      source.kind === 'anime'
        ? (['anime-list', source.animePath, pageSize] as const)
        : ([
            'lampa-items',
            source.kind,
            source.lampaSection?.endpoint,
            source.lampaSection?.fetch?.urlPath,
            pageSize,
            excludeCjk,
          ] as const),
    queryFn: async ({ pageParam }): Promise<AnimeListItem[] | LampaItem[]> => {
      if (source.kind === 'anime' && source.animePath) {
        return fetchAnimeList(source.animePath, pageParam, pageSize);
      }
      if (source.lampaSection) {
        return fetchLampaSectionItems(
          source.kind,
          source.lampaSection,
          pageParam,
          pageSize,
          { excludeCjk },
        );
      }
      return [];
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (!Array.isArray(lastPage) || lastPage.length < pageSize) return undefined;
      return allPages.length + 1;
    },
    enabled:
      gate &&
      !isRecommendationAnime &&
      ((source.kind === 'anime' && Boolean(source.animePath)) ||
        Boolean(source.lampaSection)),
  });

  const items: RailItem[] = useMemo(() => {
    if (isRecommendationAnime) {
      const section = findRecommendationSection(
        recFeedQuery.data ?? [],
        recommendationSectionId ?? '',
      );
      return uniqueById((section?.items ?? []).map(mapAnimeToRailItem));
    }
    const pages = listQuery.data?.pages ?? [];
    const mapped =
      source.kind === 'anime'
        ? pages.flatMap((page) => (page as AnimeListItem[]).map(mapAnimeToRailItem))
        : pages.flatMap((page) => (page as LampaItem[]).map(mapLampaToRailItem));
    return uniqueById(mapped);
  }, [
    isRecommendationAnime,
    recommendationSectionId,
    recFeedQuery.data,
    listQuery.data,
    source.kind,
  ]);

  const activePending = isRecommendationAnime ? recFeedQuery : listQuery;
  const isLoading =
    gate &&
    items.length === 0 &&
    !activePending.isError &&
    (activePending.isPending || activePending.isFetching);

  const openItem = (item: RailItem) => {
    const id = item.id;
    if (id == null || String(id).trim() === '' || String(id) === 'undefined') return;
    if (source.kind === 'anime') {
      router.push(`/anime/${id}`);
      return;
    }
    const href = source.kind === 'movie' ? `/movies/${id}` : `/series/${id}`;
    router.push(href as '/movies/[id]');
  };

  return {
    items,
    isLoading,
    isError: activePending.isError,
    errorMessage: activePending.isError ? (activePending.error as Error).message : undefined,
    hasNextPage: isRecommendationAnime ? false : Boolean(listQuery.hasNextPage),
    isFetchingNextPage: isRecommendationAnime ? false : listQuery.isFetchingNextPage,
    fetchNextPage: () => {
      if (!isRecommendationAnime) {
        void listQuery.fetchNextPage();
      }
    },
    openItem,
  };
}
