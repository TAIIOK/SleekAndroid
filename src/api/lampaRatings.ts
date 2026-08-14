import { unwrapData } from '@/api/client';
import { apiUrl } from '@/lib/config';
import { lampaRating } from '@/lib/lampaDetail';
import type { LampaItem } from '@/api/catalog';

export type LampaExternalRatingSource =
  | 'tmdb'
  | 'imdb'
  | 'kinopoisk'
  | 'rotten_tomatoes'
  | 'metacritic';

export interface LampaExternalRating {
  source: LampaExternalRatingSource;
  value: number;
  max: number;
  label: string;
  url?: string;
}

export interface LampaExternalRatingsPayload {
  tmdbId?: number;
  imdbId?: string;
  kinopoiskId?: string;
  ratings: LampaExternalRating[];
}

async function fetchRatingsPayload(
  kind: string,
  tmdbId: number,
): Promise<LampaExternalRatingsPayload | null> {
  try {
    const res = await fetch(apiUrl(`/api/lampa/ratings/${kind}_${tmdbId}`), {
      headers: { 'accept-language': 'ru' },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as unknown;
    return unwrapData<LampaExternalRatingsPayload>(json);
  } catch {
    return null;
  }
}

function parseRatingRow(raw: unknown): LampaExternalRating | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const source = typeof row.source === 'string' ? row.source.trim() : '';
  const value = Number(row.value);
  const max = Number(row.max);
  const label = typeof row.label === 'string' ? row.label.trim() : '';
  if (!source || !Number.isFinite(value) || value <= 0 || !Number.isFinite(max) || max <= 0) {
    return null;
  }
  if (
    source !== 'tmdb' &&
    source !== 'imdb' &&
    source !== 'kinopoisk' &&
    source !== 'rotten_tomatoes' &&
    source !== 'metacritic'
  ) {
    return null;
  }
  return {
    source,
    value,
    max,
    label: label || source,
    url: typeof row.url === 'string' && row.url.trim() ? row.url.trim() : undefined,
  };
}

function buildTmdbFallbackRating(
  kind: string,
  tmdbId: number,
  detail?: LampaItem | null,
): LampaExternalRating | null {
  const score = detail ? lampaRating(detail) : undefined;
  if (score == null) return null;
  const mediaKind = kind === 'tv' ? 'tv' : 'movie';
  return {
    source: 'tmdb',
    value: score,
    max: 10,
    label: 'TMDB',
    url: `https://www.themoviedb.org/${mediaKind}/${tmdbId}`,
  };
}

export async function fetchLampaExternalRatings(
  kind: string,
  tmdbId: number,
  detail?: LampaItem | null,
): Promise<LampaExternalRating[]> {
  const payload = await fetchRatingsPayload(kind, tmdbId);

  const ratings = Array.isArray(payload?.ratings)
    ? payload!.ratings
        .map(parseRatingRow)
        .filter((row): row is LampaExternalRating => row != null)
    : [];

  if (ratings.length) return ratings;

  const fallback = buildTmdbFallbackRating(kind, tmdbId, detail);
  return fallback ? [fallback] : [];
}
