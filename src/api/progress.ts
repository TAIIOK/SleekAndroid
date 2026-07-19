import { request, requestData, unwrapData } from './client';
import type {
  AnimeProgressPut,
  LampaProgressPut,
  UserAnimeProgress,
  UserLampaProgress,
} from '@/types/progress';

const BATCH_LIMIT = 200;

function clampProgress(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

function mapAnimeProgressRow(value: unknown): UserAnimeProgress | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const episodeId = asFiniteNumber(row.episodeId ?? row.episode_id);
  const progress = asFiniteNumber(row.progress);
  if (episodeId == null || progress == null) return null;
  const animeId = asFiniteNumber(row.animeId ?? row.anime_id);
  const episodeOrdinal = asFiniteNumber(row.episodeOrdinal ?? row.episode_ordinal);
  return {
    userId: asNonEmptyString(row.userId ?? row.user_id),
    episodeId,
    animeId,
    episodeOrdinal,
    progress: clampProgress(progress),
    completed: Boolean(row.completed),
    updatedAt: asNonEmptyString(row.updatedAt ?? row.updated_at),
  };
}

function mapLampaProgressRow(value: unknown): UserLampaProgress | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const lampaId = asNonEmptyString(
    row.lampaId ?? row.lampa_id ?? row.lampaObjectId ?? row.objectId ?? row.object_id,
  );
  const progress = asFiniteNumber(row.progress);
  if (!lampaId || progress == null) return null;
  const seasonOrdinal = asFiniteNumber(row.seasonOrdinal ?? row.season_ordinal) ?? 0;
  const episodeOrdinal = asFiniteNumber(row.episodeOrdinal ?? row.episode_ordinal) ?? 0;
  return {
    userId: asNonEmptyString(row.userId ?? row.user_id),
    lampaId,
    seasonOrdinal,
    episodeOrdinal,
    progress: clampProgress(progress),
    completed: Boolean(row.completed),
    updatedAt: asNonEmptyString(row.updatedAt ?? row.updated_at),
  };
}

function normalizeAnimeProgressList(payload: unknown): UserAnimeProgress[] {
  const data = unwrapData<unknown>(payload);
  if (Array.isArray(data)) {
    return data.map(mapAnimeProgressRow).filter((row): row is UserAnimeProgress => row != null);
  }
  if (!data || typeof data !== 'object') return [];
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj.items)) return normalizeAnimeProgressList(obj.items);
  if (Array.isArray(obj.data)) return normalizeAnimeProgressList(obj.data);
  const single = mapAnimeProgressRow(obj);
  return single ? [single] : [];
}

function normalizeLampaProgressList(payload: unknown): UserLampaProgress[] {
  const data = unwrapData<unknown>(payload);
  if (Array.isArray(data)) {
    return data.map(mapLampaProgressRow).filter((row): row is UserLampaProgress => row != null);
  }
  if (!data || typeof data !== 'object') return [];
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj.items)) return normalizeLampaProgressList(obj.items);
  if (Array.isArray(obj.data)) return normalizeLampaProgressList(obj.data);
  const single = mapLampaProgressRow(obj);
  return single ? [single] : [];
}

export async function fetchAnimeProgress(
  animeId?: number,
  animeIds?: number[],
): Promise<UserAnimeProgress[]> {
  try {
    let path = '/api/v2/progress/anime';
    if (animeId != null && Number.isFinite(animeId)) {
      path += `?animeId=${animeId}`;
    } else if (animeIds?.length) {
      path += `?animeIds=${animeIds.slice(0, BATCH_LIMIT).join(',')}`;
    }
    const json = await request<unknown>(path);
    return normalizeAnimeProgressList(json);
  } catch {
    return [];
  }
}

export async function fetchLampaProgress(
  lampaId?: string,
  lampaIds?: string[],
): Promise<UserLampaProgress[]> {
  try {
    let path = '/api/v2/progress/lampa';
    if (lampaId?.trim()) {
      path += `?lampaId=${encodeURIComponent(lampaId.trim())}`;
    } else if (lampaIds?.length) {
      path += `?lampaIds=${lampaIds
        .slice(0, BATCH_LIMIT)
        .map((id) => encodeURIComponent(id))
        .join(',')}`;
    }
    const json = await request<unknown>(path);
    return normalizeLampaProgressList(json);
  } catch {
    return [];
  }
}

export async function putAnimeProgress(
  payload: AnimeProgressPut,
): Promise<UserAnimeProgress | void> {
  const body = { ...payload, progress: clampProgress(payload.progress) };
  try {
    return await requestData<UserAnimeProgress>('/api/v2/progress/anime', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  } catch {
    return undefined;
  }
}

export async function putLampaProgress(
  payload: LampaProgressPut,
): Promise<UserLampaProgress | void> {
  const body = { ...payload, progress: clampProgress(payload.progress) };
  try {
    return await requestData<UserLampaProgress>('/api/v2/progress/lampa', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  } catch {
    return undefined;
  }
}

/** @deprecated Use putAnimeProgress */
export async function postEpisodeProgress(payload: {
  animeId: number;
  episodeId: number;
  position: number;
  duration?: number;
}): Promise<void> {
  const progress =
    payload.duration && payload.duration > 0
      ? payload.position / payload.duration
      : 0;
  await putAnimeProgress({
    animeId: payload.animeId,
    episodeId: payload.episodeId,
    progress,
    completed: progress >= 0.9,
  });
}

export function animeResumeProgress(
  rows: UserAnimeProgress[],
  episodeId: number,
): number | undefined {
  const row = rows.find((r) => r.episodeId === episodeId);
  if (!row || row.progress <= 0.01 || row.progress >= 0.98) return undefined;
  return clampProgress(row.progress);
}
