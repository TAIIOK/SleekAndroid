import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import {
  fetchLampaSectionItems,
  fetchLampaSections,
  isLampaRecommendationEndpoint,
  mapLampaToRailItem,
  type LampaSection,
} from '@/api/catalog';
import { LazyCatalogRail } from '@/components/catalog/LazyCatalogRail';
import { PosterRail, type RailItem } from '@/components/catalog/PosterRail';
import {
  filterLampaSectionsForHomeKind,
  resolveLampaSectionEndpoints,
} from '@/lib/homeSettings';
import type { ContinueWatchingDedupeKeys } from '@/lib/continueWatchingDedupe';
import { CATALOG_RAIL_PAGE_SIZE } from '@/lib/catalogRailPage';
import type { CatalogHomeConfig } from '@/types/homeConfig';

function LampaSectionRail({
  kind,
  section,
  onItemPress,
  excludeLampaKeys,
}: {
  kind: string;
  section: LampaSection;
  onItemPress: (item: RailItem) => void;
  excludeLampaKeys?: ReadonlySet<string>;
}) {
  const isRecommendation = isLampaRecommendationEndpoint(section.endpoint);
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
    queryKey: ['lampa-items', kind, section.endpoint, section.fetch?.urlPath, pageSize],
    queryFn: ({ pageParam }) => fetchLampaSectionItems(kind, section, pageParam, pageSize),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < pageSize) return undefined;
      return allPages.length + 1;
    },
    retry: isRecommendation ? false : 1,
  });

  const rawItems = useMemo(() => (data?.pages ?? []).flat(), [data]);

  if (!isLoading && (isError || rawItems.length === 0)) {
    return null;
  }

  const visibleItems = excludeLampaKeys?.size
    ? rawItems.filter((item) => !excludeLampaKeys.has(`${kind}:${item.id}`))
    : rawItems;

  if (!isLoading && visibleItems.length === 0) {
    return null;
  }

  return (
    <PosterRail
      title={section.title}
      items={visibleItems.map(mapLampaToRailItem)}
      loading={isLoading}
      onItemPress={onItemPress}
      errorMessage={isError && !isRecommendation ? (error as Error).message : undefined}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={() => {
        void fetchNextPage();
      }}
    />
  );
}

interface LampaKindRailsProps {
  kind: 'movie' | 'tv';
  config: CatalogHomeConfig;
  home?: boolean;
  firstKindId?: string;
  continueWatchingDedupe?: ContinueWatchingDedupeKeys;
}

export function LampaKindRails({
  kind,
  config,
  home = false,
  firstKindId,
  continueWatchingDedupe,
}: LampaKindRailsProps) {
  const router = useRouter();
  const { data: sections = [], isLoading } = useQuery({
    queryKey: ['lampa-sections', kind],
    queryFn: () => fetchLampaSections(kind),
  });

  const visibleSections = useMemo(() => {
    if (!sections.length) return [];
    if (!home) return sections;

    const endpoints = resolveLampaSectionEndpoints(
      config,
      kind,
      sections.map((section) => section.endpoint),
    );
    return filterLampaSectionsForHomeKind(
      sections.filter((section) => endpoints.includes(section.endpoint)),
      kind,
      firstKindId,
    );
  }, [sections, home, config, kind, firstKindId]);

  const openItem = (item: RailItem) => {
    const id = item.id;
    if (id == null || String(id).trim() === '' || String(id) === 'undefined') return;
    const href = kind === 'movie' ? `/movies/${id}` : `/series/${id}`;
    router.push(href as '/movies/[id]');
  };

  if (isLoading && !visibleSections.length) {
    return (
      <PosterRail
        title={kind === 'movie' ? 'Фильмы' : 'Сериалы'}
        items={[]}
        loading
        onItemPress={() => {}}
      />
    );
  }

  if (!visibleSections.length) return null;

  return (
    <>
      {visibleSections.map((section) => (
        <LazyCatalogRail key={`${kind}-${section.endpoint}`}>
          <LampaSectionRail
            kind={kind}
            section={section}
            onItemPress={openItem}
            excludeLampaKeys={home ? continueWatchingDedupe?.lampaKeys : undefined}
          />
        </LazyCatalogRail>
      ))}
    </>
  );
}
