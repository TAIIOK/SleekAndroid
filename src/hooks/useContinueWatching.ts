import { useEffect, useMemo, useState } from 'react';

import { useQueries, useQuery } from '@tanstack/react-query';

import { fetchAnimeBatch, fetchEpisodeById, fetchLampaDetail } from '@/api/catalog';
import { fetchSavedAnimeLibrary, fetchSavedLampaLibrary } from '@/api/library';
import { fetchAnimeProgress, fetchLampaProgress } from '@/api/progress';
import { fetchActivityHistory } from '@/api/user';
import {
  applyEpisodeOrdinalsToContinueItems,
  buildContinueWatchingItems,
  type ContinueWatchingItem,
} from '@/lib/continueWatching';
import { resolveLampaPosterUrl, resolvePosterUrl } from '@/lib/config';
import { animePoster, animeTitle, lampaPosterPath } from '@/lib/poster';
import { lampaTitle } from '@/lib/lampaDetail';
import { useWatchHistoryMetaTick } from '@/lib/watchHistoryMeta';
import { useAuth } from '@/providers/AuthProvider';
import { isTvUi } from '@/lib/isTvUi';

/** Cap visible continue cards (and ordinal N+1 fetches) on TV. */
const CONTINUE_WATCHING_LIMIT = isTvUi() ? 10 : 40;

/**
 * TV keeps a short cache so D-pad on Home is not blocked by refetch.
 * Watch return / app resume still invalidates via `useRefreshProgressOnResume`.
 * Phone stays stable until pull-to-refresh or app resume.
 */
const CONTINUE_SOURCE_QUERY = isTvUi()
  ? {
      staleTime: 45_000,
      gcTime: 5 * 60_000,
      refetchOnMount: false as const,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    }
  : {
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    };

function needsAnimePosterEnrich(item: ContinueWatchingItem): boolean {
  if (item.kind !== 'anime' || !item.animeId) return false;
  return true;
}

function lampaPosterFromDetail(detail: { poster?: unknown; posterPath?: unknown; poster_path?: unknown }): string | undefined {
  const path = lampaPosterPath(detail);
  if (!path) return undefined;
  return resolveLampaPosterUrl(path) ?? resolvePosterUrl(path);
}

export function useContinueWatching() {
  const { isAuthenticated } = useAuth();
  const historyMetaTick = useWatchHistoryMetaTick();
  const [enrichReady, setEnrichReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setEnrichReady(true), 450);
    return () => clearTimeout(timer);
  }, []);

  const savedAnimeQuery = useQuery({
    queryKey: ['library-anime', 'include-anime'],
    queryFn: fetchSavedAnimeLibrary,
    enabled: isAuthenticated,
    ...CONTINUE_SOURCE_QUERY,
  });

  const savedLampaQuery = useQuery({
    queryKey: ['library-lampa', 'include-lampa'],
    queryFn: fetchSavedLampaLibrary,
    enabled: isAuthenticated,
    ...CONTINUE_SOURCE_QUERY,
  });

  const animeProgressQuery = useQuery({
    queryKey: ['anime-progress'],
    queryFn: () => fetchAnimeProgress(),
    enabled: isAuthenticated,
    ...CONTINUE_SOURCE_QUERY,
  });

  const lampaProgressQuery = useQuery({
    queryKey: ['lampa-progress'],
    queryFn: () => fetchLampaProgress(),
    enabled: isAuthenticated,
    ...CONTINUE_SOURCE_QUERY,
  });

  const historyFeedQuery = useQuery({
    queryKey: ['history-feed'],
    queryFn: fetchActivityHistory,
    enabled: isAuthenticated,
    ...CONTINUE_SOURCE_QUERY,
  });

  const savedAnime = savedAnimeQuery.data ?? [];
  const savedLampa = savedLampaQuery.data ?? [];
  const animeProgress = animeProgressQuery.data ?? [];
  const lampaProgress = lampaProgressQuery.data ?? [];
  const historyFeed = historyFeedQuery.data ?? [];

  /** True once continue sources settled (or user is logged out). */
  const ready =
    !isAuthenticated ||
    (savedAnimeQuery.isFetched &&
      savedLampaQuery.isFetched &&
      animeProgressQuery.isFetched &&
      lampaProgressQuery.isFetched &&
      historyFeedQuery.isFetched);

  const continueBase = useMemo(() => {
    const items = buildContinueWatchingItems(
      savedAnime,
      savedLampa,
      animeProgress,
      lampaProgress,
      historyFeed,
    );
    return items.slice(0, CONTINUE_WATCHING_LIMIT);
  }, [savedAnime, savedLampa, animeProgress, lampaProgress, historyFeed, historyMetaTick]);

  const continueEpisodeIds = useMemo(
    () =>
      continueBase
        .filter((item) => item.kind === 'anime' && item.episodeId)
        .map((item) => item.episodeId!),
    [continueBase],
  );

  const missingPosterAnimeIds = useMemo(
    () =>
      continueBase
        .filter((item) => needsAnimePosterEnrich(item))
        .map((item) => item.animeId!),
    [continueBase],
  );

  const missingLampaDetails = useMemo(
    () =>
      continueBase.filter(
        (item) =>
          (item.kind === 'movie' || item.kind === 'tv') &&
          Boolean(item.routeId) &&
          (!item.poster || item.title === 'Без названия'),
      ),
    [continueBase],
  );

  const posterEnrichQuery = useQuery({
    queryKey: ['continue-anime-posters', missingPosterAnimeIds],
    queryFn: () => fetchAnimeBatch(missingPosterAnimeIds),
    enabled: enrichReady && isAuthenticated && missingPosterAnimeIds.length > 0,
    staleTime: 300_000,
  });

  const lampaDetailQueries = useQueries({
    queries: missingLampaDetails.map((item) => ({
      queryKey: ['lampa-poster', item.kind, item.routeId],
      queryFn: () => fetchLampaDetail(item.kind, item.routeId!, { skipTmdb: true }),
      enabled: enrichReady && isAuthenticated && Boolean(item.routeId),
      staleTime: 300_000,
      retry: false,
    })),
  });

  const ordinalQueries = useQueries({
    queries: continueEpisodeIds.map((episodeId) => ({
      queryKey: ['episode', episodeId],
      queryFn: () => fetchEpisodeById(episodeId),
      enabled: enrichReady && isAuthenticated && continueEpisodeIds.length > 0,
      staleTime: 300_000,
    })),
  });

  const ordinalByEpisodeId = useMemo(() => {
    const map = new Map<number, number>();
    for (const query of ordinalQueries) {
      const episode = query.data;
      if (episode?.id && episode.ordinal != null) {
        map.set(episode.id, episode.ordinal);
      }
    }
    return map;
  }, [ordinalQueries]);

  const items = useMemo(() => {
    const withOrdinals = applyEpisodeOrdinalsToContinueItems(
      continueBase,
      ordinalByEpisodeId,
    );
    const catalog = posterEnrichQuery.data;
    const animeById = new Map((catalog ?? []).map((row) => [row.id, row]));
    const lampaByRoute = new Map<string, (typeof lampaDetailQueries)[number]['data']>();
    missingLampaDetails.forEach((item, index) => {
      const detail = lampaDetailQueries[index]?.data;
      if (item.routeId && detail) lampaByRoute.set(`${item.kind}:${item.routeId}`, detail);
    });

    return withOrdinals.map((item) => {
      if (item.kind === 'anime' && item.animeId) {
        const row = animeById.get(item.animeId);
        if (!row) return item;
        const catalogPoster = resolvePosterUrl(animePoster(row));
        const poster = catalogPoster ?? item.poster;
        const catalogTitle = animeTitle(row);
        const title =
          !item.title || item.title === `Аниме ${item.animeId}`
            ? catalogTitle
            : item.title;
        if (poster === item.poster && title === item.title) return item;
        return { ...item, poster, title };
      }

      if (item.kind === 'movie' || item.kind === 'tv') {
        if (!item.routeId) return item;
        const detail = lampaByRoute.get(`${item.kind}:${item.routeId}`);
        if (!detail) return item;
        const poster = item.poster ?? lampaPosterFromDetail(detail);
        const nextTitle =
          !item.title || item.title === 'Без названия' ? lampaTitle(detail) : item.title;
        if (poster === item.poster && nextTitle === item.title) return item;
        return { ...item, poster, title: nextTitle };
      }

      return item;
    });
  }, [
    continueBase,
    ordinalByEpisodeId,
    posterEnrichQuery.data,
    lampaDetailQueries,
    missingLampaDetails,
  ]);

  return { items, isAuthenticated, ready };
}
