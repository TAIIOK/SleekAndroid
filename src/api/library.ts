import { fetchAnimeBatch } from '@/api/catalog';
import { ApiError, request, unwrapData } from './client';
import { mergeFavoriteBookmarks } from '@/lib/libraryBookmarks';
import { animePoster, lampaPosterPath } from '@/lib/poster';
import { lampaTitle } from '@/lib/lampaDetail';
import type {
  BookmarkEntry,
  FetchLibraryOptions,
  LibraryAnimeEntry,
  LibraryAnimePut,
  LibraryLampaEntry,
  LibraryLampaPut,
} from '@/types/library';
import type { SavedAnimeItem } from '@/types/progress';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function resolveAnimeListTitle(anime?: Record<string, unknown>): string | undefined {
  if (!anime) return undefined;
  for (const key of ['title', 'alternativeTitle', 'titleEn', 'name']) {
    const value = anime[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function normalizeLibraryAnimeRow(raw: unknown): LibraryAnimeEntry | null {
  if (!isRecord(raw)) return null;
  const nestedAnime = isRecord(raw.anime) ? raw.anime : undefined;
  const animeId = Number(raw.animeId ?? raw.anime_id ?? nestedAnime?.id ?? nestedAnime?.animeId);
  if (!Number.isFinite(animeId) || animeId <= 0) return null;
  const status =
    raw.status ??
    raw.userStatus ??
    raw.listStatus ??
    (isRecord(raw.savedAnime) ? raw.savedAnime.status : undefined);
  const anime = nestedAnime;
  return {
    id: typeof raw.id === 'number' ? raw.id : undefined,
    animeId,
    status: typeof status === 'string' ? status : status != null ? String(status) : undefined,
    isFavorite: Boolean(raw.isFavorite ?? raw.is_favorite),
    lastWatchingEpisode:
      typeof raw.lastWatchingEpisode === 'number'
        ? raw.lastWatchingEpisode
        : typeof raw.last_watching_episode === 'number'
          ? raw.last_watching_episode
          : undefined,
    anime,
  };
}

function normalizeLibraryLampaRow(raw: unknown): LibraryLampaEntry | null {
  if (!isRecord(raw)) return null;
  const nestedLampa = isRecord(raw.lampa) ? raw.lampa : undefined;
  const lampaObjectId = String(
    raw.lampaObjectId ??
      raw.lampa_object_id ??
      raw.objectId ??
      raw.lampaId ??
      nestedLampa?.objectId ??
      nestedLampa?.id ??
      '',
  ).trim();
  if (!lampaObjectId) return null;
  const status =
    raw.status ??
    raw.userStatus ??
    raw.listStatus ??
    (isRecord(raw.savedLampa) ? raw.savedLampa.status : undefined);
  const lampa = nestedLampa;
  return {
    id: typeof raw.id === 'number' ? raw.id : undefined,
    lampaObjectId,
    status: typeof status === 'string' ? status : status != null ? String(status) : undefined,
    isFavorite: Boolean(raw.isFavorite ?? raw.is_favorite),
    lastEpisode: typeof raw.lastEpisode === 'number' ? raw.lastEpisode : undefined,
    lastSeasson: typeof raw.lastSeasson === 'number' ? raw.lastSeasson : undefined,
    lastSeason: typeof raw.lastSeason === 'number' ? raw.lastSeason : undefined,
    lampa,
  };
}

function extractListPayload(data: unknown): unknown[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object') {
    const record = data as Record<string, unknown>;
    for (const key of ['items', 'rows', 'results', 'list', 'entries', 'anime', 'lampa', 'library']) {
      const value = record[key];
      if (Array.isArray(value)) return value;
    }
  }
  return [data];
}

function normalizeList<T>(payload: unknown, mapRow: (raw: unknown) => T | null): T[] {
  const data = unwrapData<unknown>(payload);
  const rows = extractListPayload(data);
  return rows.map(mapRow).filter((row): row is T => row != null);
}

function libraryAnimeNeedsEnrich(entry: LibraryAnimeEntry): boolean {
  if (!entry.animeId) return false;
  if (entry.anime && resolveAnimeListTitle(entry.anime)) return false;
  return true;
}

async function enrichLibraryAnimeEntries(entries: LibraryAnimeEntry[]): Promise<LibraryAnimeEntry[]> {
  const missingIds = entries.filter(libraryAnimeNeedsEnrich).map((entry) => entry.animeId!);
  if (!missingIds.length) return entries;

  const catalog = await fetchAnimeBatch(missingIds);
  const byId = new Map<number, Record<string, unknown>>();
  for (const item of catalog) {
    if (Number.isFinite(item.id)) byId.set(item.id, item as Record<string, unknown>);
  }

  return entries.map((entry) => {
    if (!libraryAnimeNeedsEnrich(entry)) return entry;
    const anime = byId.get(entry.animeId!);
    return anime ? { ...entry, anime } : entry;
  });
}

function buildLibraryQuery(options?: FetchLibraryOptions): string {
  const params = new URLSearchParams();
  if (options?.isFavorite) params.set('isFavorite', 'true');
  if (options?.include) params.set('include', options.include);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function buildLibraryPutBody(patch: LibraryAnimePut | LibraryLampaPut): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (patch.status != null && String(patch.status).trim()) body.status = String(patch.status);
  if (patch.isFavorite != null) body.isFavorite = patch.isFavorite;
  return body;
}

export async function fetchLibraryAnime(options?: FetchLibraryOptions): Promise<LibraryAnimeEntry[]> {
  try {
    const json = await request<unknown>(`/api/v2/library/anime${buildLibraryQuery(options)}`);
    return normalizeList(json, normalizeLibraryAnimeRow);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    return [];
  }
}

export async function fetchLibraryLampa(options?: FetchLibraryOptions): Promise<LibraryLampaEntry[]> {
  try {
    const json = await request<unknown>(`/api/v2/library/lampa${buildLibraryQuery(options)}`);
    return normalizeList(json, normalizeLibraryLampaRow);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    return [];
  }
}

function mapLibraryAnimeToSavedItem(entry: LibraryAnimeEntry): SavedAnimeItem {
  const anime = entry.anime;
  return {
    id: entry.id,
    animeId: entry.animeId!,
    status: entry.status,
    isFavorite: entry.isFavorite,
    lastWatchingEpisode: entry.lastWatchingEpisode,
    title: resolveAnimeListTitle(anime),
    poster: anime ? animePoster(anime) : undefined,
    anime,
  };
}

function mapLibraryLampaToSavedRow(entry: LibraryLampaEntry): Record<string, unknown> {
  const lampa = entry.lampa;
  return {
    id: entry.id,
    lampaObjectId: entry.lampaObjectId,
    status: entry.status,
    isFavorite: entry.isFavorite,
    lastEpisode: entry.lastEpisode,
    lastSeasson: entry.lastSeasson,
    lastSeason: entry.lastSeason,
    title: lampa && typeof lampa === 'object' ? lampaTitle(lampa as Record<string, unknown>) : undefined,
    poster: lampa ? lampaPosterPath(lampa) : undefined,
    ...(lampa ? { lampa } : {}),
  };
}

export async function fetchSavedAnimeLibrary(): Promise<SavedAnimeItem[]> {
  const rows = await enrichLibraryAnimeEntries(await fetchLibraryAnime({ include: 'anime' }));
  return rows.map(mapLibraryAnimeToSavedItem);
}

export async function fetchSavedLampaLibrary(): Promise<unknown[]> {
  const rows = await fetchLibraryLampa({ include: 'lampa' });
  return rows.map(mapLibraryLampaToSavedRow);
}

export async function putLibraryAnime(
  animeId: number,
  patch: LibraryAnimePut,
): Promise<LibraryAnimeEntry | null> {
  const body = buildLibraryPutBody(patch);
  if (!Object.keys(body).length) return null;
  try {
    const json = await request<unknown>(`/api/v2/library/anime/${animeId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    const rows = normalizeList(json, normalizeLibraryAnimeRow);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function putLibraryLampa(
  lampaId: string,
  patch: LibraryLampaPut,
): Promise<LibraryLampaEntry | null> {
  const body = buildLibraryPutBody(patch);
  if (!Object.keys(body).length) return null;
  const encodedId = encodeURIComponent(lampaId);
  try {
    const json = await request<unknown>(`/api/v2/library/lampa/${encodedId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    const rows = normalizeList(json, normalizeLibraryLampaRow);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function toggleAnimeFavorite(
  animeId: number,
  currentFavorite: boolean,
  currentStatus?: string,
): Promise<boolean> {
  const patch: LibraryAnimePut = { isFavorite: !currentFavorite };
  if (currentStatus) patch.status = currentStatus;
  const row = await putLibraryAnime(animeId, patch);
  return row?.isFavorite ?? !currentFavorite;
}

export async function toggleLampaFavorite(
  lampaId: string,
  currentFavorite: boolean,
  currentStatus?: string,
): Promise<boolean> {
  const patch: LibraryLampaPut = { isFavorite: !currentFavorite };
  if (currentStatus) patch.status = currentStatus;
  const row = await putLibraryLampa(lampaId, patch);
  return row?.isFavorite ?? !currentFavorite;
}

export async function fetchFavoriteBookmarks(): Promise<BookmarkEntry[]> {
  const [animeRows, lampaRows] = await Promise.all([
    fetchLibraryAnime({ isFavorite: true, include: 'anime' }),
    fetchLibraryLampa({ isFavorite: true, include: 'lampa' }),
  ]);
  return mergeFavoriteBookmarks(animeRows, lampaRows);
}

export async function updateLibraryAnimeStatus(animeId: number, status: string): Promise<void> {
  await putLibraryAnime(animeId, { status });
}

export async function updateLibraryLampaStatus(lampaId: string, status: string): Promise<void> {
  await putLibraryLampa(lampaId, { status });
}
