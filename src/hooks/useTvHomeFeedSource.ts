import type { AnimeListItem } from '@aniverse/types';
import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import {
  fetchAnimeList,
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
import type { TvHomeFeedSource } from '@/lib/tvHomeFeeds';

export function useTvHomeFeedSource(
  source: TvHomeFeedSource,
  config?: CatalogHomeConfig,
) {
  const pageSize = CATALOG_RAIL_PAGE_SIZE;
  const router = useRouter();
  const hideAsian = config ? resolveHideAsianLiveAction(config) : true;
  const excludeCjk = source.lampaSection
    ? shouldExcludeCjkFromLampaSection(source.lampaSection.endpoint, hideAsian)
    : false;

  const query = useInfiniteQuery({
    queryKey: [
      'tv-home-feed',
      source.key,
      source.kind,
      source.animePath,
      source.lampaSection?.endpoint,
      source.lampaSection?.fetch?.urlPath,
      pageSize,
      excludeCjk,
    ],
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
      (source.kind === 'anime' && Boolean(source.animePath)) ||
      Boolean(source.lampaSection),
  });

  const items: RailItem[] = useMemo(() => {
    const pages = query.data?.pages ?? [];
    const mapped =
      source.kind === 'anime'
        ? pages.flatMap((page) => (page as AnimeListItem[]).map(mapAnimeToRailItem))
        : pages.flatMap((page) => (page as LampaItem[]).map(mapLampaToRailItem));
    return uniqueById(mapped);
  }, [query.data, source.kind]);

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
    isLoading: query.isLoading,
    isError: query.isError,
    errorMessage: query.isError ? (query.error as Error).message : undefined,
    hasNextPage: Boolean(query.hasNextPage),
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: () => {
      void query.fetchNextPage();
    },
    openItem,
  };
}
