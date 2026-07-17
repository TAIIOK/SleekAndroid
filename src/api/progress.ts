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

function isAnimeProgressRow(value: unknown): value is UserAnimeProgress {
  return (
    !!value &&
    typeof value === 'object' &&
    'episodeId' in value &&
    typeof (value as UserAnimeProgress).episodeId === 'number'
  );
}

function isLampaProgressRow(value: unknown): value is UserLampaProgress {
  return (
    !!value &&
    typeof value === 'object' &&
    'lampaId' in value &&
    typeof (value as UserLampaProgress).lampaId === 'string'
  );
}

function normalizeAnimeProgressList(payload: unknown): UserAnimeProgress[] {
  const data = unwrapData<unknown>(payload);
  if (Array.isArray(data)) return data.filter(isAnimeProgressRow);
  if (!data || typeof data !== 'object') return [];
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj.items)) return normalizeAnimeProgressList(obj.items);
  if (isAnimeProgressRow(obj)) return [obj];
  return [];
}

function normalizeLampaProgressList(payload: unknown): UserLampaProgress[] {
  const data = unwrapData<unknown>(payload);
  if (Array.isArray(data)) return data.filter(isLampaProgressRow);
  if (!data || typeof data !== 'object') return [];
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj.items)) return normalizeLampaProgressList(obj.items);
  if (isLampaProgressRow(obj)) return [obj];
  return [];
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
