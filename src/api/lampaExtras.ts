import type { LampaItem } from '@/api/catalog';
import { watchHubUrl } from '@/lib/config';
import { sortLampaItemsByYear } from '@/lib/lampaDetail';

const TMDB_UID = '1q22w3e4';

function tmdbQuery(extra?: Record<string, string>): string {
  const params = new URLSearchParams({
    language: 'ru',
    uid: TMDB_UID,
    ...extra,
  });
  return params.toString();
}

async function watchHubJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(watchHubUrl(path), {
      headers: { 'accept-language': 'ru' },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function inferMediaKind(raw: Record<string, unknown>, fallback: 'movie' | 'tv'): 'movie' | 'tv' {
  const mediaType = raw.media_type ?? raw.kind;
  if (mediaType === 'tv') return 'tv';
  if (mediaType === 'movie') return 'movie';
  return typeof raw.name === 'string' && raw.name.trim() && !raw.title ? 'tv' : fallback;
}

export function mapTmdbMediaToLampaItem(
  raw: unknown,
  fallbackKind: 'movie' | 'tv',
): LampaItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const tmdbId = typeof item.id === 'number' ? item.id : undefined;
  if (!tmdbId) return null;

  const kind = inferMediaKind(item, fallbackKind);
  const releaseDate = typeof item.release_date === 'string' ? item.release_date : undefined;
  const firstAirDate = typeof item.first_air_date === 'string' ? item.first_air_date : undefined;
  return {
    id: tmdbId,
    kind,
    title: typeof item.title === 'string' ? item.title : undefined,
    name: typeof item.name === 'string' ? item.name : undefined,
    poster_path: typeof item.poster_path === 'string' ? item.poster_path : undefined,
    vote_average: typeof item.vote_average === 'number' ? item.vote_average : undefined,
    release_date: releaseDate,
    first_air_date: firstAirDate,
  } as LampaItem;
}

function mapTmdbResults(payload: unknown, fallbackKind: 'movie' | 'tv'): LampaItem[] {
  if (!payload || typeof payload !== 'object') return [];
  const results = (payload as { results?: unknown[] }).results;
  if (!Array.isArray(results)) return [];

  const seen = new Set<number>();
  const items: LampaItem[] = [];
  for (const raw of results) {
    const mapped = mapTmdbMediaToLampaItem(raw, fallbackKind);
    const id = Number(mapped?.id);
    if (!mapped || !Number.isFinite(id) || seen.has(id)) continue;
    seen.add(id);
    items.push(mapped);
  }
  return items;
}

export async function fetchLampaSimilar(
  kind: 'movie' | 'tv',
  tmdbId: number,
): Promise<LampaItem[]> {
  const payload = await watchHubJson<unknown>(
    `/tmdb/api/3/${kind}/${tmdbId}/similar?${tmdbQuery()}`,
  );
  return mapTmdbResults(payload, kind).filter((item) => Number(item.id) !== tmdbId);
}

export async function fetchLampaRecommendations(
  kind: 'movie' | 'tv',
  tmdbId: number,
): Promise<LampaItem[]> {
  const payload = await watchHubJson<unknown>(
    `/tmdb/api/3/${kind}/${tmdbId}/recommendations?${tmdbQuery()}`,
  );
  return mapTmdbResults(payload, kind).filter((item) => Number(item.id) !== tmdbId);
}

/** Titles from the same TMDB collection (franchise), oldest first. */
export async function fetchLampaRelated(
  kind: 'movie' | 'tv',
  tmdbId: number,
  collectionId?: number,
): Promise<LampaItem[]> {
  let resolvedId =
    collectionId != null && Number.isFinite(collectionId) && collectionId > 0
      ? collectionId
      : undefined;
  if (resolvedId == null) {
    const detail = await fetchTmdbLampaDetail(kind, tmdbId);
    const collection = detail?.belongs_to_collection as { id?: number } | undefined;
    resolvedId =
      collection?.id != null && Number.isFinite(collection.id) && collection.id > 0
        ? collection.id
        : undefined;
  }
  if (resolvedId == null) return [];

  const payload = await watchHubJson<{ parts?: unknown[] }>(
    `/tmdb/api/3/collection/${resolvedId}?${tmdbQuery()}`,
  );
  if (!Array.isArray(payload?.parts)) return [];

  const seen = new Set<number>();
  const items: LampaItem[] = [];
  for (const raw of payload.parts) {
    const mapped = mapTmdbMediaToLampaItem(raw, kind);
    const id = Number(mapped?.id);
    if (!mapped || !Number.isFinite(id) || id === tmdbId || seen.has(id)) continue;
    seen.add(id);
    items.push(mapped);
  }
  return sortLampaItemsByYear(items);
}

export interface LampaCastMember {
  id: number;
  name: string;
  character?: string;
  profilePath?: string;
}

/** Top billed cast from TMDB credits. */
export async function fetchLampaCast(
  kind: 'movie' | 'tv',
  tmdbId: number,
  limit = 12,
): Promise<LampaCastMember[]> {
  if (!Number.isFinite(tmdbId) || tmdbId <= 0) return [];
  const payload = await watchHubJson<{ cast?: unknown[] }>(
    `/tmdb/api/3/${kind}/${tmdbId}/credits?${tmdbQuery()}`,
  );
  if (!Array.isArray(payload?.cast)) return [];

  const members: LampaCastMember[] = [];
  for (const raw of payload.cast) {
    if (!raw || typeof raw !== 'object') continue;
    const entry = raw as Record<string, unknown>;
    const id = Number(entry.id);
    const name = typeof entry.name === 'string' ? entry.name.trim() : '';
    if (!Number.isFinite(id) || !name) continue;
    members.push({
      id,
      name,
      character: typeof entry.character === 'string' ? entry.character : undefined,
      profilePath:
        typeof entry.profile_path === 'string' && entry.profile_path.trim()
          ? entry.profile_path
          : undefined,
    });
    if (members.length >= limit) break;
  }
  return members;
}

/** TMDB detail with Russian metadata via WatchHub. */
export async function fetchTmdbLampaDetail(
  kind: 'movie' | 'tv',
  tmdbId: number,
): Promise<Record<string, unknown> | null> {
  if (!Number.isFinite(tmdbId) || tmdbId <= 0) return null;
  const params = new URLSearchParams({
    language: 'ru',
    uid: TMDB_UID,
    append_to_response: 'content_ratings',
    email: '',
  });
  return watchHubJson<Record<string, unknown>>(`/tmdb/api/3/${kind}/${tmdbId}?${params}`);
}

export interface LampaEpisodeDetail {
  id: number;
  episodeNumber: number;
  name: string;
  overview?: string;
  airDate?: string;
  stillPath?: string;
}

export interface LampaSeasonDetail {
  seasonNumber: number;
  name?: string;
  overview?: string;
  posterPath?: string;
  episodes: LampaEpisodeDetail[];
}

export async function fetchTmdbSeasonDetail(
  showId: number,
  seasonNumber: number,
): Promise<LampaSeasonDetail | null> {
  if (!Number.isFinite(showId) || showId <= 0 || seasonNumber < 0) return null;

  try {
    const params = new URLSearchParams({ language: 'ru', uid: TMDB_UID });
    const res = await fetch(
      watchHubUrl(`/tmdb/api/3/tv/${showId}/season/${seasonNumber}?${params}`),
      { headers: { 'accept-language': 'ru' } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, unknown>;
    const episodesRaw = Array.isArray(json.episodes) ? json.episodes : [];
    const episodes = episodesRaw
      .map((entry): LampaEpisodeDetail | null => {
        if (!entry || typeof entry !== 'object') return null;
        const ep = entry as Record<string, unknown>;
        const episodeNumber = Number(ep.episode_number ?? ep.episodeNumber);
        const id = Number(ep.id);
        const name = typeof ep.name === 'string' ? ep.name : '';
        if (!Number.isFinite(episodeNumber) || !name) return null;
        return {
          id: Number.isFinite(id) ? id : episodeNumber,
          episodeNumber,
          name,
          overview: typeof ep.overview === 'string' ? ep.overview : undefined,
          airDate: typeof ep.air_date === 'string' ? ep.air_date : undefined,
          stillPath: typeof ep.still_path === 'string' ? ep.still_path : undefined,
        };
      })
      .filter((ep): ep is LampaEpisodeDetail => ep !== null)
      .sort((a, b) => a.episodeNumber - b.episodeNumber);

    return {
      seasonNumber: Number(json.season_number ?? seasonNumber),
      name: typeof json.name === 'string' ? json.name : undefined,
      overview: typeof json.overview === 'string' ? json.overview : undefined,
      posterPath:
        typeof json.poster_path === 'string' && json.poster_path.trim()
          ? json.poster_path
          : undefined,
      episodes,
    };
  } catch {
    return null;
  }
}
