import { queryClient } from '@/providers/QueryProvider';
import type {
  AnimeProgressPut,
  LampaProgressPut,
  UserAnimeProgress,
  UserLampaProgress,
} from '@/types/progress';

/** Patch React Query so Continue Watching can render before the next GET. */
export function patchAnimeProgressCache(payload: AnimeProgressPut): void {
  const updatedAt = new Date().toISOString();
  const nextRow: UserAnimeProgress = {
    episodeId: payload.episodeId,
    animeId: payload.animeId,
    episodeOrdinal: payload.episodeOrdinal,
    progress: payload.progress,
    completed: Boolean(payload.completed),
    updatedAt,
  };

  const merge = (prev: UserAnimeProgress[] | undefined): UserAnimeProgress[] => {
    if (!prev?.length) return [nextRow];
    const idx = prev.findIndex((row) => row.episodeId === payload.episodeId);
    if (idx < 0) return [nextRow, ...prev];
    const existing = prev[idx];
    if ((existing.progress ?? 0) > nextRow.progress && !nextRow.completed) return prev;
    const copy = prev.slice();
    copy[idx] = { ...existing, ...nextRow };
    return copy;
  };

  queryClient.setQueryData<UserAnimeProgress[]>(['anime-progress'], merge);
  if (payload.animeId != null) {
    queryClient.setQueryData<UserAnimeProgress[]>(['anime-progress', payload.animeId], merge);
  }
}

export function patchLampaProgressCache(payload: LampaProgressPut): void {
  const updatedAt = new Date().toISOString();
  const seasonOrdinal = payload.seasonOrdinal ?? 0;
  const episodeOrdinal = payload.episodeOrdinal ?? 0;
  const nextRow: UserLampaProgress = {
    lampaId: payload.lampaId,
    seasonOrdinal,
    episodeOrdinal,
    progress: payload.progress,
    completed: Boolean(payload.completed),
    updatedAt,
  };

  const sameCoords = (row: UserLampaProgress) =>
    row.lampaId === payload.lampaId &&
    row.seasonOrdinal === seasonOrdinal &&
    row.episodeOrdinal === episodeOrdinal;

  const merge = (prev: UserLampaProgress[] | undefined): UserLampaProgress[] => {
    if (!prev?.length) return [nextRow];
    const idx = prev.findIndex(sameCoords);
    if (idx < 0) return [nextRow, ...prev];
    const existing = prev[idx];
    if ((existing.progress ?? 0) > nextRow.progress && !nextRow.completed) return prev;
    const copy = prev.slice();
    copy[idx] = { ...existing, ...nextRow };
    return copy;
  };

  queryClient.setQueryData<UserLampaProgress[]>(['lampa-progress'], merge);
  queryClient.setQueryData<UserLampaProgress[]>(['lampa-progress', payload.lampaId], merge);
}
