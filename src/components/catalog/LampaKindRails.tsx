import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  type ScrollView,
} from 'react-native';

import {
  fetchLampaSectionItems,
  fetchLampaSections,
  isLampaRecommendationEndpoint,
  mapLampaToRailItem,
  type LampaSection,
} from '@/api/catalog';
import { CatalogBrowseSkeleton } from '@/components/catalog/CatalogBrowseSkeleton';
import { LazyCatalogRail } from '@/components/catalog/LazyCatalogRail';
import { PosterRail, type RailItem } from '@/components/catalog/PosterRail';
import {
  filterLampaSectionsForHomeKind,
  resolveLampaSectionEndpoints,
} from '@/lib/homeSettings';
import type { ContinueWatchingDedupeKeys } from '@/lib/continueWatchingDedupe';
import { CATALOG_RAIL_PAGE_SIZE } from '@/lib/catalogRailPage';
import type { CatalogHomeConfig } from '@/types/homeConfig';
import { isTvUi } from '@/lib/isTvUi';

/** Minimum skeleton time so cached data does not flash unfinished rails. */
const TV_BROWSE_MIN_SKELETON_MS = 400;

function lampaItemsQueryKey(kind: string, section: LampaSection, pageSize: number) {
  return ['lampa-items', kind, section.endpoint, section.fetch?.urlPath, pageSize] as const;
}

function LampaSectionRail({
  kind,
  section,
  onItemPress,
  excludeLampaKeys,
  enabled = true,
  onSettled,
}: {
  kind: string;
  section: LampaSection;
  onItemPress: (item: RailItem) => void;
  excludeLampaKeys?: ReadonlySet<string>;
  /** When false, do not fetch yet (TV browse loads top → bottom). */
  enabled?: boolean;
  onSettled?: () => void;
}) {
  const isRecommendation = isLampaRecommendationEndpoint(section.endpoint);
  const pageSize = CATALOG_RAIL_PAGE_SIZE;
  const {
    data,
    isLoading,
    isError,
    error,
    isFetched,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: lampaItemsQueryKey(kind, section, pageSize),
    queryFn: ({ pageParam }) => fetchLampaSectionItems(kind, section, pageParam, pageSize),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < pageSize) return undefined;
      return allPages.length + 1;
    },
    enabled,
    retry: isRecommendation ? false : 1,
  });

  const rawItems = useMemo(() => (data?.pages ?? []).flat(), [data]);
  const settledOnceRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      settledOnceRef.current = false;
      return;
    }
    if (settledOnceRef.current) return;
    if (!isFetched && !isError) return;
    settledOnceRef.current = true;
    onSettled?.();
  }, [enabled, isFetched, isError, onSettled]);

  if (!enabled) {
    return null;
  }

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
  /** Unused — kept for call-site compatibility. */
  browseScrollRef?: RefObject<ScrollView | null>;
}

export function LampaKindRails({
  kind,
  config,
  home = false,
  firstKindId,
  continueWatchingDedupe,
}: LampaKindRailsProps) {
  const router = useRouter();
  const browseGate = isTvUi() && !home;
  const pageTitle = kind === 'movie' ? 'Фильмы' : 'Сериалы';
  const pageSize = CATALOG_RAIL_PAGE_SIZE;

  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
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

  // Prefetch first section so skeleton waits until the top rail can paint.
  const firstSection = browseGate ? visibleSections[0] : undefined;
  const firstQuery = useInfiniteQuery({
    queryKey: firstSection
      ? lampaItemsQueryKey(kind, firstSection, pageSize)
      : ['lampa-items', kind, '__browse_idle__', pageSize],
    queryFn: ({ pageParam }) => fetchLampaSectionItems(kind, firstSection!, pageParam, pageSize),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < pageSize) return undefined;
      return allPages.length + 1;
    },
    enabled: browseGate && Boolean(firstSection),
    retry: firstSection && isLampaRecommendationEndpoint(firstSection.endpoint) ? false : 1,
  });

  const [minSkeletonDone, setMinSkeletonDone] = useState(!browseGate);
  useEffect(() => {
    if (!browseGate) {
      setMinSkeletonDone(true);
      return;
    }
    setMinSkeletonDone(false);
    const timer = setTimeout(() => setMinSkeletonDone(true), TV_BROWSE_MIN_SKELETON_MS);
    return () => clearTimeout(timer);
  }, [browseGate, kind]);

  // Unlock rails 1 → N after each settles (top → bottom). No focus/scroll steering.
  const [enabledCount, setEnabledCount] = useState(browseGate ? 0 : Number.MAX_SAFE_INTEGER);
  const [revealed, setRevealed] = useState(!browseGate);

  useEffect(() => {
    if (!browseGate) {
      setEnabledCount(Number.MAX_SAFE_INTEGER);
      setRevealed(true);
      return;
    }
    setEnabledCount(0);
    setRevealed(false);
  }, [browseGate, kind]);

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
    setEnabledCount(1);
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

  if (!browseGate) {
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

  return (
    <>
      {visibleSections.map((section, index) => (
        <LampaSectionRail
          key={`${kind}-${section.endpoint}`}
          kind={kind}
          section={section}
          onItemPress={openItem}
          enabled={index < enabledCount}
          onSettled={() => {
            setEnabledCount((count) => {
              if (index !== count - 1) return count;
              return Math.min(count + 1, visibleSections.length);
            });
          }}
        />
      ))}
    </>
  );
}
