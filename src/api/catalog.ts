import type { AnimeEpisode, AnimeListItem } from '@aniverse/types';
import {
  CATALOG_PAGE_SIZE,
  catalogPagedPath,
  decodeAnimeList,
  decodeLampaList,
  decodeLampaRecommendationList,
  decodeRecommendationFeed,
  filterLampaItemsByKind,
  isLampaRecommendationEndpoint,
  normalizeCatalogPath,
  parseLampaRecommendationSectionId,
  parseRecommendationSectionsQuery,
  resolveLampaRecommendationUrlPath,
  type LampaListItem,
  type RecommendationFeedSection,
} from '@aniverse/catalog';

export {
  CATALOG_PAGE_SIZE,
  decodeAnimeList,
  decodeLampaList,
  decodeRecommendationFeed,
  isAnimeRecommendationShowcaseId,
  isLampaRecommendationEndpoint,
  normalizeCatalogPath,
  type RecommendationFeedSection,
} from '@aniverse/catalog';

import { apiUrl, resolveLampaPosterUrl } from '@/lib/config';
import { getImageCdnPreferenceSync } from '@/lib/imageCdn';
import { normalizeEpisode } from '@/lib/episodeUtils';
import {
  decodeLampaDetail,
  mergeLampaWithTmdb,
  resolveLampaTmdbId,
} from '@/lib/lampaDetail';
import type { AnimePosterImage } from '@/lib/poster';
import type { LampaSkipSegment, LampaSkipSegmentsData, SkipResponse } from '@/lib/playerSkip';
import { getToken } from '@/lib/storage';

import { ApiError, request, requestData, unwrapData } from './client';
import { fetchTmdbLampaDetail } from './lampaExtras';

export interface AnimeRefreshPostersResult {
  deletedCount: number;
  refreshed: boolean;
  animeUpdated: boolean;
  cooldown: boolean;
  retryAfterSeconds: number;
  postersCreated: number;
  posters: AnimePosterImage[];
}

export class RefreshPostersRateLimitedError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super('Rate limit exceeded');
    this.name = 'RefreshPostersRateLimitedError';
  }
}

function asFiniteInt(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return fallback;
}

function normalizeRefreshPostersResult(payload: unknown): AnimeRefreshPostersResult {
  const data =
    payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data: unknown }).data
      : payload;
  const row = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const postersRaw = Array.isArray(row.posters) ? row.posters : [];
  return {
    deletedCount: asFiniteInt(row.deletedCount),
    refreshed: Boolean(row.refreshed),
    animeUpdated: Boolean(row.animeUpdated),
    cooldown: Boolean(row.cooldown),
    retryAfterSeconds: Math.max(0, asFiniteInt(row.retryAfterSeconds)),
    postersCreated: asFiniteInt(row.postersCreated),
    posters: postersRaw.filter(
      (entry): entry is AnimePosterImage => !!entry && typeof entry === 'object',
    ),
  };
}

function parseRetryAfterSeconds(res: Response, body: unknown): number {
  const header = res.headers.get('Retry-After')?.trim();
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds > 0) return Math.trunc(seconds);
  }
  if (body && typeof body === 'object') {
    const retry = (body as { retry_after?: unknown; retryAfterSeconds?: unknown }).retry_after
      ?? (body as { retryAfterSeconds?: unknown }).retryAfterSeconds;
    const seconds = asFiniteInt(retry, 0);
    if (seconds > 0) return seconds;
  }
  return 60;
}

/**
 * Ask backend to verify/repair dead anime posters.
 * Auth optional. Throws RefreshPostersRateLimitedError on HTTP 429.
 */
export async function refreshAnimePosters(animeId: number): Promise<AnimeRefreshPostersResult> {
  if (!Number.isFinite(animeId) || animeId <= 0) {
    throw new ApiError('invalid animeId', 400);
  }

  const headers = new Headers({ 'Content-Type': 'application/json' });
  const token = await getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const cdn = getImageCdnPreferenceSync();
  if (cdn === 'static' || cdn === 'imgproxy') {
    headers.set('X-Image-CDN', cdn);
  }

  let res: Response;
  try {
    res = await fetch(apiUrl(`/api/animes/${animeId}/refresh-posters`), {
      method: 'POST',
      headers,
    });
  } catch {
    throw new ApiError('Сеть недоступна', 0, 'network_error');
  }

  const body = await res.json().catch(() => ({}));

  if (res.status === 429) {
    throw new RefreshPostersRateLimitedError(parseRetryAfterSeconds(res, body));
  }

  if (!res.ok) {
    throw new ApiError(
      (body as { error?: string }).error ?? res.statusText,
      res.status,
    );
  }

  return normalizeRefreshPostersResult(body);
}

export type LampaItem = LampaListItem;

export interface AnimeDetail {
  id: number;
  title?: string;
  titleEn?: string;
  alternativeTitle?: string;
  description?: string;
  poster?: string | string[];
  screenshots?: unknown;
  banner?: unknown;
  score?: number;
  year?: number;
  status?: string;
  type?: string;
  ageRating?: string;
  episodesTotal?: number;
  genres?: Array<string | { name?: string; id?: number }>;
  studios?: Array<string | { name?: string; id?: number }>;
  aggregatedRating?: { rating?: number };
}

export interface LampaSeason {
  seasonNumber?: number;
  episodeCount?: number;
  name?: string;
  overview?: string;
  air_date?: string;
  airDate?: string;
  poster_path?: string;
  posterPath?: string;
}

export interface LampaDetail {
  id: string | number;
  objectId?: string;
  tmdbId?: number | string;
  title?: string;
  name?: string;
  originalTitle?: string;
  original_title?: string;
  originalName?: string;
  original_name?: string;
  overview?: string;
  description?: string;
  poster?: string;
  poster_path?: string;
  posterPath?: string;
  backdrop_path?: string;
  backdropPath?: string;
  vote_average?: number;
  voteAverage?: number;
  release_date?: string;
  releaseDate?: string;
  first_air_date?: string;
  firstAirDate?: string;
  year?: number;
  status?: string;
  runtime?: number;
  pg?: number;
  kind?: string;
  genres?: Array<string | { name?: string; id?: number }>;
  seasons?: LampaSeason[] | Record<string, number> | unknown;
}

export interface LampaSectionFetch {
  method?: string;
  path?: string;
  query?: Record<string, string>;
  urlPath?: string;
  hint?: string;
}

export interface LampaSection {
  endpoint: string;
  title: string;
  fetch?: LampaSectionFetch;
}

export interface LampaKind {
  id: string;
  name: string;
  sectionsPath?: string;
}

export interface LampaCategoriesData {
  kinds?: LampaKind[];
}

export interface CatalogShowcase {
  id: string;
  name: string;
  path: string;
}

export interface CatalogFilter {
  id: string;
  name: string;
  type: string;
  sourcePath?: string;
  itemPathTemplate?: string;
  values?: string[];
  path?: string;
  params?: string[];
}

export interface AnimeCategoriesData {
  filters?: CatalogFilter[];
  showcases?: CatalogShowcase[];
}

export interface CatalogContentType {
  id: string;
  name: string;
}

export async function fetchCatalog(): Promise<CatalogContentType[]> {
  return requestData<CatalogContentType[]>('/api/catalog');
}

export async function fetchAnimeCategories(): Promise<AnimeCategoriesData> {
  return requestData<AnimeCategoriesData>('/api/catalog/anime/categories');
}

export async function fetchLampaCategories(): Promise<LampaCategoriesData> {
  return requestData<LampaCategoriesData>('/api/catalog/lampa/categories');
}

export async function fetchLampaSections(kind: string): Promise<LampaSection[]> {
  return requestData<LampaSection[]>(`/api/catalog/lampa/categories/${kind}/sections`);
}

export async function fetchLampaSection(
  kind: string,
  endpoint: string,
  page = 1,
  limit = CATALOG_PAGE_SIZE,
  options?: { excludeCjk?: boolean },
): Promise<LampaItem[]> {
  const enc = encodeURIComponent(endpoint);
  const exclude = options?.excludeCjk ? '&excludeCjk=1' : '';
  const json = await request<unknown>(
    `/api/lampa/tmdb/catalog/${kind}/section?endpoint=${enc}&page=${page}&limit=${limit}${exclude}`,
  );
  return decodeLampaList(json);
}

export async function fetchLampaSectionByUrlPath(
  urlPath: string,
  page = 1,
  limit = CATALOG_PAGE_SIZE,
  options?: {
    kind?: 'movie' | 'tv';
    sectionId?: string | null;
  },
): Promise<LampaItem[]> {
  const kind = options?.kind;
  const resolved = kind
    ? resolveLampaRecommendationUrlPath(urlPath, kind)
    : normalizeCatalogPath(urlPath);
  const normalized = resolved.startsWith('/') ? resolved : `/${resolved}`;
  const requestPath = catalogPagedPath(normalized, page, limit);
  const json = await request<unknown>(requestPath);
  if (normalized.includes('/catalog/recommendations/lampa')) {
    const sectionFilter =
      parseRecommendationSectionsQuery(normalized) ?? options?.sectionId ?? null;
    const items = decodeLampaRecommendationList(json, sectionFilter);
    return kind ? filterLampaItemsByKind(items, kind) : items;
  }
  const items = decodeLampaList(json);
  return kind ? filterLampaItemsByKind(items, kind) : items;
}

export async function fetchLampaSectionItems(
  kind: string,
  section: LampaSection,
  page = 1,
  limit = CATALOG_PAGE_SIZE,
  options?: { excludeCjk?: boolean },
): Promise<LampaItem[]> {
  const isRecommendation = isLampaRecommendationEndpoint(section.endpoint);
  const useRecommendationFetch = isRecommendation && Boolean(section.fetch?.urlPath);

  if (isRecommendation && !section.fetch?.urlPath) {
    return [];
  }

  try {
    if (useRecommendationFetch && section.fetch?.urlPath) {
      return fetchLampaSectionByUrlPath(section.fetch.urlPath, page, limit, {
        kind: kind as 'movie' | 'tv',
        sectionId: parseLampaRecommendationSectionId(section.endpoint),
      });
    }
    const items = await fetchLampaSection(kind, section.endpoint, page, limit, {
      excludeCjk: options?.excludeCjk,
    });
    return filterLampaItemsByKind(items, kind as 'movie' | 'tv');
  } catch {
    if (isRecommendation) return [];
    throw new Error('Не удалось загрузить секцию каталога');
  }
}

export async function fetchAnimeRecommendationFeed(
  limit = 24,
): Promise<RecommendationFeedSection[]> {
  const json = await request<unknown>(`/api/v2/catalog/recommendations/anime?limit=${limit}`);
  return decodeRecommendationFeed(json);
}

export async function fetchAnimeList(
  path: string,
  page = 1,
  limit = CATALOG_PAGE_SIZE,
): Promise<AnimeListItem[]> {
  const resolved = normalizeCatalogPath(path);
  const normalized = resolved.startsWith('/') ? resolved : `/${resolved}`;
  const requestPath = catalogPagedPath(normalized, page, limit);
  const json = await request<unknown>(requestPath);
  return decodeAnimeList(json);
}

const ANIME_BATCH_LIMIT = 100;

export async function fetchAnimeBatch(animeIds: number[]): Promise<AnimeListItem[]> {
  const ids = [...new Set(animeIds.filter((id) => Number.isFinite(id) && id > 0))].slice(
    0,
    ANIME_BATCH_LIMIT,
  );
  if (!ids.length) return [];
  try {
    const json = await request<unknown>(`/api/v1/animes/batch?animes=${ids.join(',')}`);
    return decodeAnimeList(json);
  } catch {
    return [];
  }
}

export async function fetchAnimeDetail(animeId: number): Promise<AnimeDetail> {
  return requestData<AnimeDetail>(`/api/animes/${animeId}`);
}

export interface AnimeRelated {
  id?: number;
  animeId?: number;
  relatedAnimeId?: number;
  relationType?: string;
  title?: string;
  poster?: unknown;
  anime?: AnimeListItem;
  relatedAnime?: AnimeListItem;
}

export async function fetchAnimeRelated(animeId: number): Promise<AnimeRelated[]> {
  try {
    const json = await request<unknown>(`/api/animes/get/related/${animeId}`);
    if (Array.isArray(json)) return json as AnimeRelated[];
    const data = json && typeof json === 'object' && 'data' in json
      ? (json as { data: unknown }).data
      : json;
    return Array.isArray(data) ? (data as AnimeRelated[]) : [];
  } catch {
    return [];
  }
}

export interface AnimeCharacter {
  id?: number;
  name?: string;
  image?: string;
  role?: string;
}

export async function fetchAnimeCharacters(animeId: number): Promise<AnimeCharacter[]> {
  try {
    const json = await request<unknown>(`/api/animes/get/characters/${animeId}?id=${animeId}`);
    if (Array.isArray(json)) return json as AnimeCharacter[];
    const data =
      json && typeof json === 'object' && 'data' in json
        ? (json as { data: unknown }).data
        : json;
    return Array.isArray(data) ? (data as AnimeCharacter[]) : [];
  } catch {
    return [];
  }
}

export interface AnimeScheduleEntry {
  id?: number;
  anime_id?: number;
  next_date?: number;
  anime?: AnimeListItem;
}

export async function fetchSchedule(week = 0, limit = 50): Promise<AnimeScheduleEntry[]> {
  try {
    const qs = new URLSearchParams({
      week: String(week),
      limit: String(limit),
    });
    const json = await request<unknown>(`/api/base/schedule?${qs}`);
    if (Array.isArray(json)) return json as AnimeScheduleEntry[];
    const data =
      json && typeof json === 'object' && 'data' in json
        ? (json as { data: unknown }).data
        : json;
    return Array.isArray(data) ? (data as AnimeScheduleEntry[]) : [];
  } catch {
    return [];
  }
}

export async function fetchGenres(): Promise<{ id: number; name: string }[]> {
  try {
    const json = await requestData<{ id: number; name: string }[] | { genres?: { id: number; name: string }[] }>(
      '/api/catalog/genres',
    );
    if (Array.isArray(json)) return json;
    return json.genres ?? [];
  } catch {
    return [];
  }
}

export async function fetchLampaGenres(): Promise<Array<{ id: number | string; name: string }>> {
  try {
    const json = await request<unknown>('/api/lampa/genres?limit=100');
    type Genre = { id: number | string; name: string };
    if (Array.isArray(json)) return json as Genre[];
    if (json && typeof json === 'object') {
      const obj = json as { data?: unknown; items?: unknown };
      if (Array.isArray(obj.items)) return obj.items as Genre[];
      if (Array.isArray(obj.data)) return obj.data as Genre[];
    }
    return [];
  } catch {
    return [];
  }
}

export async function fetchAnimeSkip(
  animeId: number,
  episode: number,
  type: 'opening' | 'ending' = 'opening',
): Promise<SkipResponse | null> {
  // Sleek / AniSkip proxy expects `op` | `ed`, not `opening` | `ending`.
  const apiType = type === 'opening' ? 'op' : 'ed';
  try {
    const json = await request<SkipResponse>(
      `/api/animes/get/opening?id=${animeId}&episode=${episode}&type=${apiType}`,
      { skipAuth: true },
    );
    return json ?? null;
  } catch {
    return null;
  }
}

export async function fetchLampaSkipSegments(params: {
  tmdbId: number;
  imdbId?: string;
  season: number;
  episode: number;
}): Promise<LampaSkipSegment[]> {
  const { tmdbId, imdbId, season, episode } = params;
  if (!Number.isFinite(tmdbId) || tmdbId <= 0) return [];
  if (!Number.isFinite(season) || season < 0) return [];
  if (!Number.isFinite(episode) || episode < 1) return [];

  try {
    const qs = new URLSearchParams({
      tmdbId: String(tmdbId),
      season: String(season),
      episode: String(episode),
    });
    const trimmedImdb = imdbId?.trim();
    if (trimmedImdb) qs.set('imdbId', trimmedImdb);

    const data = await requestData<LampaSkipSegmentsData>(`/api/lampa/skip-segments?${qs}`, {
      skipAuth: true,
    });
    return Array.isArray(data?.segments) ? data.segments : [];
  } catch {
    return [];
  }
}

export async function fetchAnimeEpisodes(
  animeId: number,
  page = 1,
  limit = 50,
): Promise<{ episodes: AnimeEpisode[]; totalPages: number }> {
  const json = await request<{
    data?: unknown[];
    meta?: { totalPages?: number; total?: number };
  }>(`/api/animes/${animeId}/episodes?page=${page}&limit=${limit}`);
  const episodes = (json.data ?? []).map(normalizeEpisode);
  const total = json.meta?.total;
  const totalPages =
    json.meta?.totalPages ??
    (total && limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1);
  return { episodes, totalPages: Math.max(1, totalPages) };
}

export function mapLampaToRailItem(item: LampaItem) {
  const posterPath = lampaItemPoster(item);
  return {
    id: item.id,
    title: lampaItemTitle(item),
    // Resolve here so cards always get a full WatchHub/TMDB URL (w500 for sharp TV rails).
    poster: posterPath ? resolveLampaPosterUrl(posterPath, 'w500') : undefined,
    score:
      item.vote_average ??
      (typeof (item as { voteAverage?: number }).voteAverage === 'number'
        ? (item as { voteAverage: number }).voteAverage
        : undefined),
  };
}

export async function fetchLampaDetail(kind: string, routeId: string): Promise<LampaDetail> {
  const normalizedKind = kind === 'home' ? 'tv' : kind;
  const mediaKind = (normalizedKind === 'tv' ? 'tv' : 'movie') as 'movie' | 'tv';

  if (!/^\d+$/.test(routeId)) {
    throw new ApiError('Неверный идентификатор', 400);
  }

  let payload;
  try {
    const raw = await request<unknown>(`/api/lampa/item/${normalizedKind}/${routeId}`);
    payload = decodeLampaDetail(unwrapData(raw));
  } catch (e) {
    const tmdb = await fetchTmdbLampaDetail(mediaKind, Number(routeId));
    if (tmdb) return mergeLampaWithTmdb(null, tmdb, normalizedKind).detail;
    throw e;
  }

  const tmdbId = resolveLampaTmdbId(payload.detail, routeId);
  if (tmdbId != null) {
    try {
      const tmdb = await fetchTmdbLampaDetail(mediaKind, tmdbId);
      if (tmdb) return mergeLampaWithTmdb(payload, tmdb, normalizedKind).detail;
    } catch {
      /* keep backend payload */
    }
  }

  return payload.detail;
}

export interface CatalogSearchParams {
  q: string;
  type?: string;
  limit?: number;
  page?: number;
  year?: string;
  genre?: string;
  status?: string;
  animeType?: string;
  season?: string;
  ageRating?: string;
  ratingMin?: string;
  lampaKind?: string;
  lampaGenre?: string;
  lampaStatus?: string;
  lampaMinRating?: string;
  lampaLang?: string;
  lampaCountry?: string;
  sortBy?: string;
  order?: string;
}

export interface CatalogSearchData {
  anime?: AnimeListItem[];
  lampa?: LampaItem[];
}

export async function searchCatalog(params: CatalogSearchParams): Promise<CatalogSearchData> {
  const qs = new URLSearchParams({ q: params.q });
  const setIf = (key: string, value?: string | number) => {
    if (value != null && String(value).trim() !== '') qs.set(key, String(value));
  };
  setIf('type', params.type);
  setIf('limit', params.limit);
  setIf('page', params.page);
  setIf('year', params.year);
  setIf('genre', params.genre);
  setIf('status', params.status);
  setIf('animeType', params.animeType);
  setIf('season', params.season);
  setIf('ageRating', params.ageRating);
  setIf('ratingMin', params.ratingMin);
  setIf('lampaKind', params.lampaKind);
  setIf('lampaGenre', params.lampaGenre);
  setIf('lampaStatus', params.lampaStatus);
  setIf('lampaMinRating', params.lampaMinRating);
  setIf('lampaLang', params.lampaLang);
  setIf('lampaCountry', params.lampaCountry);
  setIf('sortBy', params.sortBy);
  if (params.sortBy) setIf('order', params.order);
  const json = await request<{ data?: CatalogSearchData } | CatalogSearchData>(
    `/api/catalog/search?${qs}`,
  );
  if (json && typeof json === 'object' && 'data' in json) {
    return (json as { data: CatalogSearchData }).data ?? {};
  }
  return json as CatalogSearchData;
}

export async function fetchEpisodeById(episodeId: number): Promise<AnimeEpisode | null> {
  try {
    const json = await request<unknown>(`/api/episodes/${episodeId}`);
    const raw =
      json && typeof json === 'object' && 'data' in json
        ? (json as { data: unknown }).data
        : json;
    return normalizeEpisode(raw);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function fetchHistory(): Promise<HistoryItem[]> {
  try {
    const json = await request<{ data?: HistoryItem[] } | HistoryItem[]>(
      '/api/user/history?limit=100',
    );
    if (Array.isArray(json)) return json;
    return json.data ?? [];
  } catch {
    return [];
  }
}

export interface HistoryItem {
  id?: string | number;
  animeId?: number;
  episodeId?: number;
  title?: string;
  poster?: string;
  kind?: string;
  lampaId?: string;
  progress?: number;
}

export function lampaItemTitle(item: LampaItem): string {
  const raw = item as LampaItem & {
    names?: Array<string | { name?: string }>;
    original_title?: string;
    originalTitle?: string;
    original_name?: string;
    originalName?: string;
  };
  for (const value of [
    raw.title,
    raw.name,
    raw.originalTitle,
    raw.original_title,
    raw.originalName,
    raw.original_name,
  ]) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  if (Array.isArray(raw.names)) {
    for (const entry of raw.names) {
      if (typeof entry === 'string' && entry.trim()) return entry.trim();
      if (entry && typeof entry === 'object' && typeof entry.name === 'string' && entry.name.trim()) {
        return entry.name.trim();
      }
    }
  }
  return 'Без названия';
}

export function lampaItemPoster(item: LampaItem): string | undefined {
  const raw = item as LampaItem & {
    posterPath?: string;
    backdrop_path?: string;
    backdropPath?: string;
  };
  for (const value of [
    raw.poster,
    raw.poster_path,
    raw.posterPath,
    raw.backdrop_path,
    raw.backdropPath,
  ]) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}
