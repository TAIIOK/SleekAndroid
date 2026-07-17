import { useQuery } from '@tanstack/react-query';

import { fetchAnimeEpisodes, fetchEpisodeById } from '@/api/catalog';
import { hasPlayableVideo } from '@/lib/animeDetail';

async function resolveResumeEpisode(animeId: number, lastEpisodeId?: number) {
  if (lastEpisodeId) {
    try {
      const ep = await fetchEpisodeById(lastEpisodeId);
      if (ep && hasPlayableVideo(ep)) return ep;
    } catch {
      /* fall through */
    }
  }
  const page = await fetchAnimeEpisodes(animeId, 1, 12);
  return page.episodes.find(hasPlayableVideo) ?? page.episodes[0] ?? null;
}

export function useResumeEpisode(animeId: number, lastEpisodeId?: number) {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['anime-resume-episode', animeId, lastEpisodeId ?? 'start'],
    queryFn: () => resolveResumeEpisode(animeId, lastEpisodeId),
    enabled: Number.isFinite(animeId) && animeId > 0,
    staleTime: 60_000,
  });

  return {
    resumeEpisode: data ?? null,
    isLoading: isLoading || (isFetching && !data),
  };
}
