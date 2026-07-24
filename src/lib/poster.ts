import type { AnimeListItem } from '@aniverse/types';

export interface AnimePosterImage {
  type?: string;
  source?: string;
  optimized?: string;
  thumbnail?: string;
  preview?: string;
}

/** Normalize protocol-relative `//host/...` to `https://host/...`. */
export function normalizedAbsoluteURLString(value?: string | null): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  return trimmed;
}

/**
 * Reject placeholder / broken hosts (e.g. `https://source2`).
 * Mirrors iOS `CatalogPosterURL.isPlausibleImageURL`.
 */
export function isPlausibleImageURL(value: string): boolean {
  try {
    const absolute = normalizedAbsoluteURLString(value) ?? value;
    const url = new URL(absolute);
    const scheme = url.protocol.replace(':', '').toLowerCase();
    if (scheme !== 'http' && scheme !== 'https') return false;
    const host = url.hostname.toLowerCase();
    return host.includes('.');
  } catch {
    return false;
  }
}

function isAvif(value: string): boolean {
  const lower = value.toLowerCase();
  return lower.endsWith('.avif') || lower.includes('.avif?');
}

/**
 * Prefer usable poster variants (iOS CatalogPosterURL.pick).
 * Always favor full `source` / `optimized` over small thumbnails.
 * API sometimes returns a broken optimized AVIF while source JPG is valid.
 */
export function pickPosterImageUrl(img: AnimePosterImage): string | undefined {
  return pickPosterCandidateUrls([img.source, img.optimized, img.thumbnail, img.preview]);
}

export function pickPosterCandidateUrls(candidates: Array<string | null | undefined>): string | undefined {
  const urls = candidates
    .map((value) => normalizedAbsoluteURLString(value))
    .filter((value): value is string => !!value && isPlausibleImageURL(value));
  const nonAvif = urls.find((url) => !isAvif(url));
  return nonAvif ?? urls[0];
}

/** Prefer the dedicated poster entry over episode screenshots in mixed arrays. */
export function pickFromPosterImages(images: AnimePosterImage[]): string | undefined {
  const typed = images.find((entry) => (entry.type ?? '').toLowerCase() === 'poster');
  if (typed) {
    const picked = pickPosterImageUrl(typed);
    if (picked) return picked;
  }
  for (const image of images) {
    const picked = pickPosterImageUrl(image);
    if (picked) return picked;
  }
  return undefined;
}

/** Normalize API poster field (string, object, or array) to a single path/url. */
export function extractPosterPath(poster: unknown): string | undefined {
  if (!poster) return undefined;
  if (typeof poster === 'string') {
    const trimmed = poster.trim();
    if (!trimmed) return undefined;
    // Absolute URLs must be plausible; relative API/TMDB paths pass through.
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('//')) {
      const normalized = normalizedAbsoluteURLString(trimmed);
      return normalized && isPlausibleImageURL(normalized) ? normalized : undefined;
    }
    return trimmed;
  }
  if (Array.isArray(poster)) {
    const objects = poster.filter(
      (entry): entry is AnimePosterImage => !!entry && typeof entry === 'object',
    );
    if (objects.length) {
      const picked = pickFromPosterImages(objects);
      if (picked) return picked;
    }
    const match =
      poster.find(
        (entry) =>
          entry &&
          typeof entry === 'object' &&
          (entry as AnimePosterImage).type === 'poster',
      ) ?? poster[0];
    if (!match) return undefined;
    if (typeof match === 'string') {
      return extractPosterPath(match);
    }
    return undefined;
  }
  if (typeof poster === 'object') {
    return pickPosterImageUrl(poster as AnimePosterImage);
  }
  return undefined;
}

export function animePoster(item: { poster?: unknown }): string | undefined {
  return extractPosterPath(item.poster);
}

/** Same quality as `animePoster` — rails use full source/optimized. */
export function animePosterForRail(item: { poster?: unknown }): string | undefined {
  return animePoster(item);
}

export function lampaPosterPath(item: {
  poster?: unknown;
  poster_path?: unknown;
  posterPath?: unknown;
}): string | undefined {
  return (
    extractPosterPath(item.poster) ??
    extractPosterPath(item.poster_path) ??
    extractPosterPath(item.posterPath)
  );
}

/** Pick a non-empty anime title (API sometimes sends "" instead of omitting). */
export function animeTitle(item: {
  title?: unknown;
  name?: unknown;
  originalTitle?: unknown;
  original_title?: unknown;
}): string {
  for (const value of [item.title, item.name, item.originalTitle, item.original_title]) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return 'Без названия';
}

export function mapAnimeToRailItem(item: AnimeListItem) {
  const animeId = typeof item.id === 'number' && item.id > 0 ? item.id : undefined;
  return {
    id: item.id,
    animeId,
    title: animeTitle(item),
    poster: animePosterForRail(item),
    score: item.score,
  };
}
