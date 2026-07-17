import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';

import { fetchSavedAnimeLibrary, fetchSavedLampaLibrary } from '@/api/library';
import { fetchAnimeProgress, fetchLampaProgress } from '@/api/progress';
import { fetchEpisodeById } from '@/api/catalog';
import {
  applyEpisodeOrdinalsToContinueItems,
  buildContinueWatchingItems,
} from '@/lib/continueWatching';
import { useAuth } from '@/providers/AuthProvider';

export function useContinueWatching() {
  const { isAuthenticated } = useAuth();

  const { data: savedAnime = [] } = useQuery({
    queryKey: ['library-anime', 'include-anime'],
    queryFn: fetchSavedAnimeLibrary,
    enabled: isAuthenticated,
  });

  const { data: savedLampa = [] } = useQuery({
    queryKey: ['library-lampa', 'include-lampa'],
    queryFn: fetchSavedLampaLibrary,
    enabled: isAuthenticated,
  });

  const { data: animeProgress = [] } = useQuery({
    queryKey: ['anime-progress'],
    queryFn: () => fetchAnimeProgress(),
    enabled: isAuthenticated,
  });

  const { data: lampaProgress = [] } = useQuery({
    queryKey: ['lampa-progress'],
    queryFn: () => fetchLampaProgress(),
    enabled: isAuthenticated,
  });

  const continueBase = useMemo(
    () => buildContinueWatchingItems(savedAnime, savedLampa, animeProgress, lampaProgress),
    [savedAnime, savedLampa, animeProgress, lampaProgress],
  );

  const continueEpisodeIds = useMemo(
    () =>
      continueBase
        .filter((item) => item.kind === 'anime' && item.episodeId)
        .map((item) => item.episodeId!),
    [continueBase],
  );

  const ordinalQueries = useQueries({
    queries: continueEpisodeIds.map((episodeId) => ({
      queryKey: ['episode-ordinal', episodeId],
      queryFn: async () => {
        const episode = await fetchEpisodeById(episodeId);
        return { episodeId, ordinal: episode?.ordinal ?? null };
      },
      enabled: isAuthenticated && continueEpisodeIds.length > 0,
      staleTime: 300_000,
    })),
  });

  const ordinalByEpisodeId = useMemo(() => {
    const map = new Map<number, number>();
    for (const query of ordinalQueries) {
      const data = query.data;
      if (data?.ordinal != null) map.set(data.episodeId, data.ordinal);
    }
    return map;
  }, [ordinalQueries]);

  const items = useMemo(
    () => applyEpisodeOrdinalsToContinueItems(continueBase, ordinalByEpisodeId),
    [continueBase, ordinalByEpisodeId],
  );

  return { items, isAuthenticated };
}
