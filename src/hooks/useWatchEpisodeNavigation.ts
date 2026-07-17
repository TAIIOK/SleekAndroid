import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchAnimeDetail, fetchAnimeEpisodes } from '@/api/catalog';
import type { AnimeEpisode } from '@aniverse/types';

const NAV_LIMIT = 500;

export function useWatchEpisodeNavigation(animeId: number, currentEpisodeId: number) {
  const { data: detail } = useQuery({
    queryKey: ['anime', animeId],
    queryFn: () => fetchAnimeDetail(animeId),
    staleTime: 120_000,
  });

  const totalEpisodes = detail?.episodesTotal ?? NAV_LIMIT;
  const fetchLimit = Math.min(Math.max(totalEpisodes, 1), NAV_LIMIT);

  const { data, isLoading } = useQuery({
    queryKey: ['watch-nav-episodes', animeId, fetchLimit],
    queryFn: () => fetchAnimeEpisodes(animeId, 1, fetchLimit),
    staleTime: 120_000,
  });

  const episodes = data?.episodes ?? [];

  const items = useMemo(
    () =>
      episodes.map((ep) => ({
        id: ep.id,
        ordinal: ep.ordinal ?? ep.id,
        label: ep.title?.trim() ? `Эп. ${ep.ordinal ?? ep.id} · ${ep.title}` : `Эпизод ${ep.ordinal ?? ep.id}`,
      })),
    [episodes],
  );

  const currentIndex = items.findIndex((item) => item.id === currentEpisodeId);
  const previous = currentIndex > 0 ? items[currentIndex - 1] : undefined;
  const next =
    currentIndex >= 0 && currentIndex < items.length - 1 ? items[currentIndex + 1] : undefined;

  const episodeById = useMemo(() => {
    const map = new Map<number, AnimeEpisode>();
    for (const ep of episodes) map.set(ep.id, ep);
    return map;
  }, [episodes]);

  return {
    items,
    isLoading,
    previous,
    next,
    episodeById,
    hasPrevious: Boolean(previous),
    hasNext: Boolean(next),
  };
}
