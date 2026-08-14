import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState, type RefObject } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type ScrollView,
} from 'react-native';

import {
  fetchLampaSectionItems,
  fetchLampaSections,
  mapLampaToRailItem,
  type LampaSection,
} from '@/api/catalog';
import { CatalogBrowseSkeleton } from '@/components/catalog/CatalogBrowseSkeleton';
import { LazyCatalogRail } from '@/components/catalog/LazyCatalogRail';
import { PosterRail, type RailItem } from '@/components/catalog/PosterRail';
import { useDeferredMount } from '@/hooks/useDeferredMount';
import {
  filterLampaSectionsForHomeKind,
  resolveHideAsianLiveAction,
  resolveLampaSectionEndpoints,
  shouldExcludeCjkFromLampaSection,
} from '@/lib/homeSettings';
import { lampaItemsQueryKey } from '@/lib/lampaBrowse';
import { orderLampaSectionsByEndpoints } from '@/lib/lampaSectionOrder';
import type { ContinueWatchingDedupeKeys } from '@/lib/continueWatchingDedupe';
import { CATALOG_RAIL_PAGE_SIZE, TV_CATALOG_EAGER_RAILS } from '@/lib/catalogRailPage';
import { uniqueById } from '@/lib/searchConfig';
import type { CatalogHomeConfig } from '@/types/homeConfig';
import { isTvUi } from '@/lib/isTvUi';

/** Minimum skeleton time so cached data does not flash unfinished rails. */
const TV_BROWSE_MIN_SKELETON_MS = 400;

function LampaSectionRail({
  kind,
  section,
  onItemPress,
  excludeLampaKeys,
  excludeCjk = false,
  restorePath,
  railFocusPriority,
}: {
  kind: string;
  section: LampaSection;
  onItemPress: (item: RailItem) => void;
  excludeLampaKeys?: ReadonlySet<string>;
  excludeCjk?: boolean;
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
    queryKey: lampaItemsQueryKey(kind, section, pageSize, excludeCjk),
    queryFn: ({ pageParam }) =>
      fetchLampaSectionItems(kind, section, pageParam, pageSize, { excludeCjk }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < pageSize) return undefined;
      return allPages.length + 1;
    },
    retry: 1,
  });

  const rawItems = useMemo(() => uniqueById((data?.pages ?? []).flat()), [data]);

  const visibleItems = excludeLampaKeys?.size
    ? rawItems.filter((item) => !excludeLampaKeys.has(`${kind}:${item.id}`))
    : rawItems;

  return (
    <PosterRail
      title={section.title}
      items={visibleItems.map(mapLampaToRailItem)}
      loading={isLoading}
      onItemPress={onItemPress}
      errorMessage={isError ? (error as Error).message : undefined}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={() => {
        void fetchNextPage();
      }}
      restorePath={restorePath}
      restoreRailKey={`${kind}:${section.endpoint}`}
      railFocusPriority={railFocusPriority}
    />
  );
}

interface LampaKindRailsProps {
  kind: 'movie' | 'tv';
  config: CatalogHomeConfig;
  home?: boolean;
  firstKindId?: string;
  continueWatchingDedupe?: ContinueWatchingDedupeKeys;
  /** Unused — kept for call-site compatibility. */
  browseScrollRef?: RefObject<ScrollView | null>;
  restorePath?: string;
}

export function LampaKindRails({
  kind,
  config,
  home = false,
  firstKindId,
  continueWatchingDedupe,
  restorePath,
}: LampaKindRailsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const browseGate = isTvUi() && !home;
  const pageTitle = kind === 'movie' ? 'Фильмы' : 'Сериалы';
  const pageSize = CATALOG_RAIL_PAGE_SIZE;

  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ['lampa-sections', kind],
    queryFn: () => fetchLampaSections(kind),
  });

  const hideAsian = resolveHideAsianLiveAction(config);

  const visibleSections = useMemo(() => {
    if (!sections.length) return [];
    const endpoints = resolveLampaSectionEndpoints(
      config,
      kind,
      sections.map((section) => section.endpoint),
    );
    const ordered = orderLampaSectionsByEndpoints(sections, endpoints);
    if (!home) return ordered;
    return filterLampaSectionsForHomeKind(ordered, kind, firstKindId);
  }, [sections, home, config, kind, firstKindId]);

  // Prefetch first section so skeleton waits until the top rail can paint.
  const firstSection = browseGate ? visibleSections[0] : undefined;
  const firstExcludeCjk = firstSection
    ? shouldExcludeCjkFromLampaSection(firstSection.endpoint, hideAsian)
    : false;
  const firstQuery = useInfiniteQuery({
    queryKey: firstSection
      ? lampaItemsQueryKey(kind, firstSection, pageSize, firstExcludeCjk)
      : ['lampa-items', kind, '__browse_idle__', pageSize, false],
    queryFn: ({ pageParam }) =>
      fetchLampaSectionItems(kind, firstSection!, pageParam, pageSize, {
        excludeCjk: firstExcludeCjk,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < pageSize) return undefined;
      return allPages.length + 1;
    },
    enabled: browseGate && Boolean(firstSection),
    retry: 1,
  });

  // Cached first page: skip the cold-start skeleton. Remaining rails stay viewport-gated.
  const cacheWarm = useMemo(() => {
    if (!browseGate || !firstSection) return false;
    return (
      queryClient.getQueryData(
        lampaItemsQueryKey(kind, firstSection, pageSize, firstExcludeCjk),
      ) != null
    );
  }, [browseGate, firstSection, kind, pageSize, firstExcludeCjk, queryClient]);

  const [minSkeletonDone, setMinSkeletonDone] = useState(() => !browseGate || cacheWarm);
  useEffect(() => {
    if (!browseGate) {
      setMinSkeletonDone(true);
      return;
    }
    if (cacheWarm) {
      setMinSkeletonDone(true);
      return;
    }
    setMinSkeletonDone(false);
    const timer = setTimeout(() => setMinSkeletonDone(true), TV_BROWSE_MIN_SKELETON_MS);
    return () => clearTimeout(timer);
  }, [browseGate, kind, cacheWarm]);

  const [revealed, setRevealed] = useState(() => !browseGate || cacheWarm);

  useEffect(() => {
    if (!browseGate) {
      setRevealed(true);
      return;
    }
    if (cacheWarm) {
      setRevealed(true);
      return;
    }
    setRevealed(false);
  }, [browseGate, kind, cacheWarm]);

  const firstSettled =
    !browseGate ||
    !firstSection ||
    firstQuery.isFetched ||
    firstQuery.isError;

  const canReveal =
    browseGate &&
    minSkeletonDone &&
    !sectionsLoading &&
    visibleSections.length > 0 &&
    firstSettled;

  useEffect(() => {
    if (!canReveal || revealed) return;
    setRevealed(true);
  }, [canReveal, revealed]);

  const openItem = (item: RailItem) => {
    const id = item.id;
    if (id == null || String(id).trim() === '' || String(id) === 'undefined') return;
    const href = kind === 'movie' ? `/movies/${id}` : `/series/${id}`;
    router.push(href as '/movies/[id]');
  };

  if (browseGate && !revealed) {
    return <CatalogBrowseSkeleton />;
  }

  if (!browseGate && sectionsLoading && !visibleSections.length) {
    return (
      <PosterRail title={pageTitle} items={[]} loading onItemPress={() => {}} />
    );
  }

  if (!visibleSections.length) return null;

  return (
    <LampaKindRailsList
      kind={kind}
      sections={visibleSections}
      hideAsian={hideAsian}
      home={home}
      continueWatchingDedupe={continueWatchingDedupe}
      restorePath={restorePath}
      onItemPress={openItem}
    />
  );
}

function LampaKindRailsList({
  kind,
  sections,
  hideAsian,
  home,
  continueWatchingDedupe,
  restorePath,
  onItemPress,
}: {
  kind: 'movie' | 'tv';
  sections: LampaSection[];
  hideAsian: boolean;
  home: boolean;
  continueWatchingDedupe?: ContinueWatchingDedupeKeys;
  restorePath?: string;
  onItemPress: (item: RailItem) => void;
}) {
  const belowFoldReady = useDeferredMount(!home);

  return (
    <>
      {sections.map((section, index) => {
        const eager = index < TV_CATALOG_EAGER_RAILS;
        if (!home && !eager && !belowFoldReady) return null;
        return (
          <LazyCatalogRail
            key={`${kind}-${section.endpoint}`}
            eager={eager}
            homeLazy={home}
            sessionKey={home ? `home:lampa:${kind}:${section.endpoint}` : undefined}
          >
            <LampaSectionRail
              kind={kind}
              section={section}
              onItemPress={onItemPress}
              excludeCjk={shouldExcludeCjkFromLampaSection(section.endpoint, hideAsian)}
              excludeLampaKeys={home ? continueWatchingDedupe?.lampaKeys : undefined}
              restorePath={restorePath}
              railFocusPriority={index}
            />
          </LazyCatalogRail>
        );
      })}
    </>
  );
}
