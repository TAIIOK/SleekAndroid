import type { LampaDetail } from '@/api/catalog';
import type { SavedAnimeItem, UserAnimeProgress, UserLampaProgress } from '@/types/progress';
import { lampaProgressKey } from '@/lib/lampaDetail';

const COMPLETED_THRESHOLD = 0.9;
/** Resume / continue-watching: treat as unfinished only inside this range. */
export const IN_PROGRESS_MIN = 0.01;
export const IN_PROGRESS_MAX = 0.98;
/**
 * Auto-next / brief open can leave a tiny stub on the next episode.
 * Prefer rows at/above this when any exist.
 */
export const SUBSTANTIAL_PROGRESS_MIN = 0.05;

export function normalizeProgress(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function isEpisodeCompleted(progress: number, completed?: boolean): boolean {
  return !!completed || progress >= COMPLETED_THRESHOLD;
}

/** True when the user can still resume this row (excludes stubs and completed). */
export function isUnfinishedProgress(progress: number, completed?: boolean): boolean {
  if (completed) return false;
  const value = normalizeProgress(progress);
  return value > IN_PROGRESS_MIN && value < IN_PROGRESS_MAX;
}

function parseProgressUpdatedAtMs(value?: string): number {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function pickLatestByUpdatedAt<T extends { updatedAt?: string; progress: number }>(
  rows: T[],
): T {
  return rows.reduce((best, row) => {
    const bestTime = parseProgressUpdatedAtMs(best.updatedAt);
    const rowTime = parseProgressUpdatedAtMs(row.updatedAt);
    if (rowTime !== bestTime) return rowTime > bestTime ? row : best;
    return row.progress >= best.progress ? row : best;
  });
}

/** True when the row reflects real watch activity (stub opens excluded). */
function hasMeaningfulProgress(progress: number, completed?: boolean): boolean {
  if (completed) return true;
  return normalizeProgress(progress) > IN_PROGRESS_MIN;
}

/**
 * Resume / continue-watching picker.
 * Ignores unfinished rows superseded by a later completed (or otherwise finished)
 * watch — e.g. TV left episode 3 at 40%, phone finished episodes 4–8.
 * Among remaining unfinished rows, prefers substantial progress over tiny stubs.
 */
function pickLatestUnfinishedRow<T extends { progress: number; completed: boolean; updatedAt?: string }>(
  rows: T[],
): T | undefined {
  const meaningful = rows.filter((row) => hasMeaningfulProgress(row.progress, row.completed));
  if (!meaningful.length) return undefined;

  const finished = meaningful.filter(
    (row) => !isUnfinishedProgress(row.progress, row.completed),
  );
  const finishedMs = finished.length
    ? parseProgressUpdatedAtMs(pickLatestByUpdatedAt(finished).updatedAt)
    : 0;

  const unfinished = meaningful.filter(
    (row) =>
      isUnfinishedProgress(row.progress, row.completed) &&
      parseProgressUpdatedAtMs(row.updatedAt) >= finishedMs,
  );
  if (!unfinished.length) return undefined;

  const substantial = unfinished.filter(
    (row) => normalizeProgress(row.progress) >= SUBSTANTIAL_PROGRESS_MIN,
  );
  return pickLatestByUpdatedAt(substantial.length ? substantial : unfinished);
}

export function pickLatestUnfinishedAnimeRow(
  rows: UserAnimeProgress[],
): UserAnimeProgress | undefined {
  return pickLatestUnfinishedRow(rows);
}

export function pickLatestUnfinishedLampaRow(
  rows: UserLampaProgress[],
): UserLampaProgress | undefined {
  return pickLatestUnfinishedRow(rows);
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
  if (!row || !isUnfinishedProgress(row.progress, row.completed)) return undefined;
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
    if (!row || !isUnfinishedProgress(row.progress, row.completed)) return undefined;
    return normalizeProgress(row.progress);
  }

  const row = rows.find(
    (r) =>
      r.lampaId === normalizedId &&
      r.seasonOrdinal === 0 &&
      r.episodeOrdinal === 0,
  );
  if (!row || !isUnfinishedProgress(row.progress, row.completed)) return undefined;
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
  const latestUnfinished = pickLatestUnfinishedAnimeRow(
    progressRows.filter((row) => row.animeId == null || row.animeId === animeId),
  );

  let lastEpisodeId = latestUnfinished?.episodeId;
  let lastProgress = latestUnfinished ? normalizeProgress(latestUnfinished.progress) : 0;

  // Library lastWatchingEpisode only when there is no unfinished progress row.
  if (!lastEpisodeId && item?.lastWatchingEpisode) {
    const libraryId = item.lastWatchingEpisode;
    const libraryProgress = progressByEpisodeId[libraryId] ?? 0;
    if (isUnfinishedProgress(libraryProgress)) {
      lastEpisodeId = libraryId;
      lastProgress = libraryProgress;
    } else if (item.status === 'watching') {
      lastEpisodeId = libraryId;
      lastProgress = 0;
    }
  }

  return {
    userStatus: item?.status,
    progressByEpisodeId,
    lastEpisodeId,
    lastProgress,
    hasHistory:
      !!lastEpisodeId &&
      (isUnfinishedProgress(lastProgress) || item?.status === 'watching'),
    isFavorite: !!item?.isFavorite,
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
  const latestUnfinished = pickLatestUnfinishedLampaRow(scopedRows);

  let lastEpisode: number;
  let lastSeason: number;
  let lastProgress: number;

  if (latestUnfinished) {
    const isMovieCoords =
      latestUnfinished.seasonOrdinal === 0 && latestUnfinished.episodeOrdinal === 0;
    lastSeason = isMovieCoords ? 1 : latestUnfinished.seasonOrdinal || 1;
    lastEpisode = isMovieCoords ? 1 : latestUnfinished.episodeOrdinal || 1;
    lastProgress = normalizeProgress(latestUnfinished.progress);
  } else {
    // Library lastEpisode/lastSeason only when there is no unfinished progress row.
    lastEpisode = Number(match?.lastEpisode ?? 1) || 1;
    lastSeason = Number(match?.lastSeasson ?? match?.lastSeason ?? 1) || 1;
    const key = lampaProgressKey(lastSeason, lastEpisode);
    const keyed = episodeProgressByKey[key] ?? 0;
    lastProgress = isUnfinishedProgress(keyed) ? keyed : 0;
  }

  return {
    status: typeof match?.status === 'string' ? match.status : undefined,
    isFavorite: Boolean(match?.isFavorite),
    lastEpisode,
    lastSeason,
    lastProgress,
    hasHistory:
      isUnfinishedProgress(lastProgress) ||
      (typeof match?.status === 'string' && match.status === 'watching' && lastProgress >= 0),
    episodeProgressByKey,
  };
}
