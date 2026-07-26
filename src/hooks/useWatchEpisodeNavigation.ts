import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchAnimeDetail, fetchAnimeEpisodes } from '@/api/catalog';
import type { PlayerEpisodeNavItem } from '@/components/player/types';
import {
  episodeNumber,
  episodeThumbnail,
  isRedundantEpisodeTitle,
} from '@/lib/animeDetail';
import { resolveAnimePosterUrl } from '@/lib/config';
import type { AnimeEpisode } from '@aniverse/types';

const NAV_LIMIT = 500;

export function useWatchEpisodeNavigation(
  animeId: number,
  currentEpisodeId: number,
  progressByEpisodeId: Record<number, number> = {},
) {
  const { data: detail } = useQuery({
    queryKey: ['anime', animeId],
    queryFn: () => fetchAnimeDetail(animeId),
    staleTime: 120_000,
  });

  const totalEpisodes = detail?.episodesTotal;
  // Never clamp to 1 when API reports 0/missing — that hides prev/next and the
  // episodes overlay (hasEpisodes requires items.length > 1).
  const fetchLimit = Math.min(
    Math.max(
      typeof totalEpisodes === 'number' && Number.isFinite(totalEpisodes) && totalEpisodes > 1
        ? totalEpisodes
        : NAV_LIMIT,
      100,
    ),
    NAV_LIMIT,
  );

  const { data, isLoading } = useQuery({
    queryKey: ['watch-nav-episodes', animeId, fetchLimit],
    queryFn: () => fetchAnimeEpisodes(animeId, 1, fetchLimit),
    staleTime: 120_000,
    enabled: Number.isFinite(animeId) && animeId > 0,
  });

  const episodes = data?.episodes ?? [];

  const items = useMemo((): PlayerEpisodeNavItem[] => {
    return episodes.map((ep) => {
      const num = episodeNumber(ep);
      const rawTitle = ep.title?.trim();
      const title =
        rawTitle && !isRedundantEpisodeTitle(rawTitle, num) ? rawTitle : undefined;
      const thumb = resolveAnimePosterUrl(episodeThumbnail(ep));
      const progress = progressByEpisodeId[ep.id];
      return {
        id: ep.id,
        number: num,
        label: title ? `Эп. ${num} · ${title}` : `Эпизод ${num}`,
        title: title ?? `Эпизод ${num}`,
        thumbnail: thumb,
        durationSec: typeof ep.duration === 'number' && ep.duration > 0 ? ep.duration : undefined,
        progress: typeof progress === 'number' ? progress : undefined,
      };
    });
  }, [episodes, progressByEpisodeId]);

  const currentIndex = items.findIndex(
    (item) => Number(item.id) === Number(currentEpisodeId),
  );
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
