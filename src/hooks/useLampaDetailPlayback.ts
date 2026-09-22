import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import type { LampaDetail } from '@/api/catalog';
import { fetchLampaProgress } from '@/api/progress';
import { fetchActivityHistory } from '@/api/user';
import {
  buildLampaPlaybackState,
  collectLampaProgressAliasIds,
  lampaDetailAliasIds,
  lampaPlaybackHasResume,
  type SavedLampaPlaybackState,
} from '@/lib/progressUtils';
import type { UserLampaProgress } from '@/types/progress';

const EMPTY_PROGRESS: UserLampaProgress[] = [];
const EMPTY_HISTORY: unknown[] = [];

/**
 * Resume for one title. Narrow `lampaIds` first; the unfiltered progress list
 * is used only when that fetch is empty and Home already cached it.
 * History runs only when those rows still have no resume fields, then any
 * newly discovered alias ids are fetched on their own.
 */
export function useLampaDetailPlayback(options: {
  enabled: boolean;
  detail: LampaDetail | undefined;
  routeId: string;
  saved: unknown[];
}): SavedLampaPlaybackState | null {
  const { enabled, detail, routeId, saved } = options;
  const aliasIds = useMemo(
    () => (detail ? lampaDetailAliasIds(detail, routeId) : []),
    [detail, routeId],
  );
  const aliasKey = aliasIds.slice().sort().join('|');

  const narrow = useQuery({
    queryKey: ['lampa-progress', 'detail', aliasKey],
    queryFn: () => fetchLampaProgress(undefined, aliasIds),
    enabled: enabled && aliasIds.length > 0,
    staleTime: 30_000,
  });

  const cachedFull = useQuery({
    queryKey: ['lampa-progress'],
    queryFn: () => fetchLampaProgress(),
    enabled: false,
  });

  const cachedHistory = useQuery({
    queryKey: ['history-feed'],
    queryFn: fetchActivityHistory,
    enabled: false,
    staleTime: 60_000,
  });

  const mergedRows = useMemo(() => {
    const narrowHit = narrow.data ?? EMPTY_PROGRESS;
    const cached = cachedFull.data ?? EMPTY_PROGRESS;
    if (!narrowHit.length) return cached;
    if (!cached.length) return narrowHit;
    const seen = new Set(
      narrowHit.map((row) => `${row.lampaId}:${row.seasonOrdinal}:${row.episodeOrdinal}`),
    );
    const rest = cached.filter(
      (row) => !seen.has(`${row.lampaId}:${row.seasonOrdinal}:${row.episodeOrdinal}`),
    );
    return rest.length ? [...narrowHit, ...rest] : narrowHit;
  }, [cachedFull.data, narrow.data]);

  const cachedHistoryRows = cachedHistory.data ?? EMPTY_HISTORY;
  const preliminary = useMemo(
    () =>
      detail
        ? buildLampaPlaybackState(saved, detail, mergedRows, routeId, cachedHistoryRows)
        : null,
    [saved, detail, mergedRows, routeId, cachedHistoryRows],
  );

  const progressSettled = !enabled || aliasIds.length === 0 || narrow.isFetched || narrow.isError;
  const needsHistory =
    enabled &&
    !!detail &&
    progressSettled &&
    !lampaPlaybackHasResume(preliminary) &&
    cachedHistory.data == null;

  const history = useQuery({
    queryKey: ['history-feed'],
    queryFn: fetchActivityHistory,
    enabled: needsHistory,
    staleTime: 60_000,
    refetchOnMount: false,
  });

  const historyForAlias = history.data ?? cachedHistory.data;
  const extraIds = useMemo(() => {
    if (!enabled || !detail || !historyForAlias?.length || lampaPlaybackHasResume(preliminary)) {
      return [];
    }
    const known = new Set(aliasIds);
    return collectLampaProgressAliasIds(routeId, aliasIds, historyForAlias).filter(
      (id) => !known.has(id),
    );
  }, [aliasIds, detail, enabled, historyForAlias, preliminary, routeId]);
  const extraKey = extraIds.slice().sort().join('|');

  const extra = useQuery({
    queryKey: ['lampa-progress', 'detail-alias', extraKey],
    queryFn: () => fetchLampaProgress(undefined, extraIds),
    enabled: progressSettled && extraIds.length > 0,
    staleTime: 30_000,
  });

  const progressRows = useMemo(() => {
    if (!extra.data?.length) return mergedRows;
    return [...mergedRows, ...extra.data];
  }, [mergedRows, extra.data]);

  const historyFeed = history.data ?? cachedHistoryRows;

  return useMemo(
    () =>
      detail
        ? buildLampaPlaybackState(saved, detail, progressRows, routeId, historyFeed)
        : null,
    [detail, saved, progressRows, routeId, historyFeed],
  );
}
