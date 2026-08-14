import type { QueryClient } from '@tanstack/react-query';

import {
  fetchAnimeCategories,
  fetchAnimeList,
  fetchLampaSectionItems,
  fetchLampaSections,
} from '@/api/catalog';
import { CATALOG_RAIL_PAGE_SIZE } from '@/lib/catalogRailPage';
import { resolveHideAsianLiveAction } from '@/lib/homeSettings';
import {
  firstLampaSectionExcludeCjk,
  firstVisibleLampaSection,
  lampaItemsQueryKey,
} from '@/lib/lampaBrowse';
import { currentSeasonalShowcase } from '@/lib/seasonal';
import type { CatalogHomeConfig } from '@/types/homeConfig';

export { firstVisibleLampaSection, lampaItemsQueryKey } from '@/lib/lampaBrowse';

function infiniteNextPage(pageSize: number) {
  return (lastPage: unknown[], allPages: unknown[][]) => {
    if (lastPage.length < pageSize) return undefined;
    return allPages.length + 1;
  };
}

async function prefetchLampaKind(
  queryClient: QueryClient,
  config: CatalogHomeConfig,
  kind: 'movie' | 'tv',
  pageSize: number,
  hideAsian: boolean,
): Promise<void> {
  const sections = await queryClient.fetchQuery({
    queryKey: ['lampa-sections', kind],
    queryFn: () => fetchLampaSections(kind),
  });
  const first = firstVisibleLampaSection(sections, kind, config);
  if (!first) return;
  const excludeCjk = firstLampaSectionExcludeCjk(first, hideAsian);
  await queryClient.prefetchInfiniteQuery({
    queryKey: lampaItemsQueryKey(kind, first, pageSize, excludeCjk),
    queryFn: ({ pageParam }) =>
      fetchLampaSectionItems(kind, first, pageParam, pageSize, { excludeCjk }),
    initialPageParam: 1,
    getNextPageParam: infiniteNextPage(pageSize),
  });
}

/** Warm Anime / Movies / Series first-rail caches after Home is interactive. */
export async function prefetchCatalogHubQueries(
  queryClient: QueryClient,
  config: CatalogHomeConfig,
): Promise<void> {
  const pageSize = CATALOG_RAIL_PAGE_SIZE;
  const seasonal = currentSeasonalShowcase();
  const hideAsian = resolveHideAsianLiveAction(config);

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['anime-categories'],
      queryFn: fetchAnimeCategories,
    }),
    queryClient.prefetchInfiniteQuery({
      queryKey: ['anime-seasonal', seasonal.path, pageSize],
      queryFn: ({ pageParam }) => fetchAnimeList(seasonal.path, pageParam, pageSize),
      initialPageParam: 1,
      getNextPageParam: infiniteNextPage(pageSize),
    }),
    prefetchLampaKind(queryClient, config, 'movie', pageSize, hideAsian),
    prefetchLampaKind(queryClient, config, 'tv', pageSize, hideAsian),
  ]);
}
