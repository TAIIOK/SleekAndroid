import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchAnimeEpisodes } from '@/api/catalog';
import type { AnimeEpisode } from '@aniverse/types';

export function useAccumulatedEpisodes(animeId: number, pageSize = 24) {
  const [page, setPage] = useState(1);
  const [episodes, setEpisodes] = useState<AnimeEpisode[]>([]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['anime-episodes', animeId, page, pageSize],
    queryFn: () => fetchAnimeEpisodes(animeId, page, pageSize),
    enabled: Number.isFinite(animeId) && animeId > 0,
  });

  useEffect(() => {
    setPage(1);
    setEpisodes([]);
  }, [animeId]);

  useEffect(() => {
    if (!data?.episodes) return;
    setEpisodes((prev) => {
      const seen = new Set(prev.map((ep) => ep.id));
      const next = [...prev];
      for (const ep of data.episodes) {
        if (!seen.has(ep.id)) next.push(ep);
      }
      return next;
    });
  }, [data]);

  return {
    episodes,
    totalPages: data?.totalPages ?? 1,
    page,
    setPage,
    isLoading: isLoading && episodes.length === 0,
    isFetchingMore: isFetching && page > 1,
    hasMore: page < (data?.totalPages ?? 1),
    loadMore: () => setPage((value) => value + 1),
  };
}
