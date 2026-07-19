import type { LampaDetail } from '@/api/catalog';
import type { SavedAnimeItem, UserAnimeProgress, UserLampaProgress } from '@/types/progress';
import { lampaProgressKey } from '@/lib/lampaDetail';

const COMPLETED_THRESHOLD = 0.9;

export function normalizeProgress(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function isEpisodeCompleted(progress: number, completed?: boolean): boolean {
  return !!completed || progress >= COMPLETED_THRESHOLD;
}

export function lampaSeasonEpisodeForWatch(
  isSerial: boolean,
  season?: number,
  episode?: number,
): { seasonOrdinal: number; episodeOrdinal: number } | null {
  if (isSerial) {
    if (season == null || episode == null) return null;
    return { seasonOrdinal: season, episodeOrdinal: episode };
  }
  return { seasonOrdinal: 0, episodeOrdinal: 0 };
}

export function animeResumeProgress(
  rows: UserAnimeProgress[],
  episodeId: number,
): number | undefined {
  const row = rows.find((r) => r.episodeId === episodeId);
  if (!row || row.progress <= 0.01 || row.progress >= 0.98) return undefined;
  return normalizeProgress(row.progress);
}

export function lampaResumeProgress(
  rows: UserLampaProgress[],
  lampaId: string,
  season?: number,
  episode?: number,
  isSerial = true,
): number | undefined {
  const normalizedId = lampaId.trim();
  if (!normalizedId) return undefined;

  if (isSerial && season != null && episode != null) {
    const row = rows.find(
      (r) =>
        r.lampaId === normalizedId &&
        r.seasonOrdinal === season &&
        r.episodeOrdinal === episode,
    );
    if (!row || row.progress <= 0.01 || row.progress >= 0.98) return undefined;
    return normalizeProgress(row.progress);
  }

  const row = rows.find(
    (r) =>
      r.lampaId === normalizedId &&
      r.seasonOrdinal === 0 &&
      r.episodeOrdinal === 0,
  );
  if (!row || row.progress <= 0.01 || row.progress >= 0.98) return undefined;
  return normalizeProgress(row.progress);
}

export function animeProgressByEpisodeId(
  rows: UserAnimeProgress[],
  animeId?: number,
): Record<number, number> {
  const map: Record<number, number> = {};
  for (const row of rows) {
    if (animeId != null && row.animeId != null && row.animeId !== animeId) continue;
    const progress = normalizeProgress(row.progress);
    if (progress <= 0) continue;
    map[row.episodeId] = Math.max(map[row.episodeId] ?? 0, progress);
  }
  return map;
}

export function lampaProgressByKey(
  rows: UserLampaProgress[],
  lampaId?: string,
): Record<string, number> {
  const normalizedId = lampaId?.trim();
  const map: Record<string, number> = {};
  for (const row of rows) {
    if (normalizedId && row.lampaId !== normalizedId) continue;
    const progress = normalizeProgress(row.progress);
    if (progress <= 0) continue;
    const key =
      row.seasonOrdinal === 0 && row.episodeOrdinal === 0
        ? lampaProgressKey(1, 1)
        : lampaProgressKey(row.seasonOrdinal, row.episodeOrdinal);
    map[key] = Math.max(map[key] ?? 0, progress);
  }
  return map;
}

export function groupAnimeProgressByAnimeId(
  rows: UserAnimeProgress[],
): Map<number, UserAnimeProgress[]> {
  const map = new Map<number, UserAnimeProgress[]>();
  for (const row of rows) {
    const animeId = row.animeId;
    if (animeId == null) continue;
    const list = map.get(animeId) ?? [];
    list.push(row);
    map.set(animeId, list);
  }
  return map;
}

export function groupLampaProgressById(
  rows: UserLampaProgress[],
): Map<string, UserLampaProgress[]> {
  const map = new Map<string, UserLampaProgress[]>();
  for (const row of rows) {
    const list = map.get(row.lampaId) ?? [];
    list.push(row);
    map.set(row.lampaId, list);
  }
  return map;
}

export interface SavedAnimePlaybackState {
  userStatus?: string;
  progressByEpisodeId: Record<number, number>;
  lastEpisodeId?: number;
  lastProgress: number;
  hasHistory: boolean;
  isFavorite: boolean;
}

export function buildAnimePlaybackState(
  saved: SavedAnimeItem[],
  animeId: number,
  progressRows: UserAnimeProgress[],
): SavedAnimePlaybackState {
  const item = saved.find((s) => (s.animeId ?? s.id) === animeId);
  const progressByEpisodeId = animeProgressByEpisodeId(progressRows, animeId);

  if (!item) {
    let lastEpisodeId: number | undefined;
    let lastProgress = 0;
    for (const [epId, progress] of Object.entries(progressByEpisodeId)) {
      if (progress <= 0.01 || progress >= 0.98) continue;
      if (!lastEpisodeId || progress >= lastProgress) {
        lastEpisodeId = Number(epId);
        lastProgress = progress;
      }
    }
    return {
      progressByEpisodeId,
      lastEpisodeId,
      lastProgress,
      hasHistory: !!lastEpisodeId && lastProgress > 0.01 && lastProgress < 0.98,
      isFavorite: false,
    };
  }

  let lastEpisodeId = item.lastWatchingEpisode;
  let lastProgress = lastEpisodeId ? (progressByEpisodeId[lastEpisodeId] ?? 0) : 0;

  if (!lastEpisodeId || lastProgress <= 0.01) {
    for (const [epId, progress] of Object.entries(progressByEpisodeId)) {
      if (progress <= 0.01 || progress >= 0.98) continue;
      if (!lastEpisodeId || progress >= lastProgress) {
        lastEpisodeId = Number(epId);
        lastProgress = progress;
      }
    }
  }

  return {
    userStatus: item.status,
    progressByEpisodeId,
    lastEpisodeId,
    lastProgress,
    hasHistory:
      !!lastEpisodeId &&
      lastProgress < 0.98 &&
      (lastProgress > 0.01 || item.status === 'watching'),
    isFavorite: !!item.isFavorite,
  };
}

export interface SavedLampaPlaybackState {
  status?: string;
  isFavorite: boolean;
  lastEpisode: number;
  lastSeason: number;
  lastProgress: number;
  hasHistory: boolean;
  episodeProgressByKey: Record<string, number>;
}

export function buildLampaPlaybackState(
  saved: unknown[],
  detail: LampaDetail,
  progressRows: UserLampaProgress[],
): SavedLampaPlaybackState {
  const objectId =
    typeof detail.objectId === 'string'
      ? detail.objectId
      : detail.objectId != null
        ? String(detail.objectId)
        : undefined;
  const numericId = detail.id != null ? String(detail.id) : undefined;

  const match = saved.find((raw) => {
    if (!raw || typeof raw !== 'object') return false;
    const row = raw as Record<string, unknown>;
    const nested = row.lampa as { objectId?: string; id?: number | string } | undefined;
    if (objectId && (row.lampaObjectId === objectId || nested?.objectId === objectId)) {
      return true;
    }
    if (numericId && nested?.id != null && String(nested.id) === numericId) return true;
    if (numericId && row.id != null && String(row.id) === numericId) return true;
    return false;
  }) as Record<string, unknown> | undefined;

  const candidateIds = [objectId, numericId, match?.lampaObjectId]
    .map((value) => (value == null ? '' : String(value).trim()))
    .filter(Boolean);
  const scopedRows = candidateIds.length
    ? progressRows.filter((row) => candidateIds.includes(row.lampaId))
    : progressRows;
  // Rows may be keyed by objectId or numeric route/tmdb id — merge without a single-id filter.
  const episodeProgressByKey = lampaProgressByKey(scopedRows);
  const progressValues = Object.values(episodeProgressByKey);
  const maxProgress = progressValues.length ? Math.max(...progressValues) : 0;

  const lastEpisode = Number(match?.lastEpisode ?? 1) || 1;
  const lastSeason = Number(match?.lastSeasson ?? match?.lastSeason ?? 1) || 1;

  return {
    status: typeof match?.status === 'string' ? match.status : undefined,
    isFavorite: Boolean(match?.isFavorite),
    lastEpisode,
    lastSeason,
    lastProgress: maxProgress,
    hasHistory: maxProgress > 0.02,
    episodeProgressByKey,
  };
}
