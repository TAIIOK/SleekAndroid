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

const HERO_BACKDROP_TYPES = ['background', 'banner', 'fanart', 'landscape'] as const;

export function isHeroBackdropImageType(type?: string): boolean {
  const normalized = (type ?? '').trim().toLowerCase();
  return (HERO_BACKDROP_TYPES as readonly string[]).includes(normalized);
}

function isUsableHeroPath(value: string | null | undefined): value is string {
  const trimmed = value?.trim();
  if (!trimmed) return false;
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('//')
  ) {
    return isPlausibleImageURL(trimmed);
  }
  if (trimmed.startsWith('/')) return true;
  return trimmed.includes('.') && trimmed.includes('/');
}

/** Hero/backdrop: prefer full-resolution source over compressed optimized. */
export function pickHeroPosterImageUrl(img: AnimePosterImage): string | undefined {
  const urls = [img.source, img.preview, img.optimized, img.thumbnail]
    .filter(isUsableHeroPath)
    .map((value) => normalizedAbsoluteURLString(value) ?? value.trim());
  const nonAvif = urls.find((url) => !isAvif(url));
  return nonAvif ?? urls[0];
}

export function uniqueImagePaths(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    const normalized = normalizedAbsoluteURLString(trimmed) ?? trimmed;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function asPosterImages(poster: unknown): Array<string | AnimePosterImage> {
  if (!poster) return [];
  if (typeof poster === 'string') return [poster];
  if (Array.isArray(poster)) {
    return poster.filter(
      (entry): entry is string | AnimePosterImage =>
        typeof entry === 'string' || (!!entry && typeof entry === 'object'),
    );
  }
  if (typeof poster === 'object') return [poster as AnimePosterImage];
  return [];
}

/** Collect all poster image paths in hero quality order (source first per object). */
export function collectPosterImageCandidates(poster: unknown): string[] {
  const entries = asPosterImages(poster);
  if (!entries.length) return [];
  const paths: string[] = [];
  for (const entry of entries) {
    if (typeof entry === 'string') {
      const trimmed = entry.trim();
      if (trimmed) paths.push(trimmed);
      continue;
    }
    const url = pickHeroPosterImageUrl(entry);
    if (url) paths.push(url);
    for (const fallback of [entry.optimized, entry.thumbnail, entry.preview, entry.source]) {
      if (isUsableHeroPath(fallback)) {
        paths.push(normalizedAbsoluteURLString(fallback) ?? fallback.trim());
      }
    }
  }
  return uniqueImagePaths(paths);
}

/** Landscape hero assets: Image(type=background|banner|fanart|landscape). */
export function collectBackdropImageCandidates(poster: unknown): string[] {
  const images = asPosterImages(poster);
  if (!images.length) return [];
  const byType = new Map<string, string[]>();
  for (const entry of images) {
    if (typeof entry === 'string' || !isHeroBackdropImageType(entry.type)) continue;
    const url = pickHeroPosterImageUrl(entry);
    if (!url) continue;
    const key = (entry.type ?? '').trim().toLowerCase();
    const list = byType.get(key) ?? [];
    list.push(url);
    byType.set(key, list);
  }
  const paths: string[] = [];
  for (const type of HERO_BACKDROP_TYPES) {
    paths.push(...(byType.get(type) ?? []));
  }
  return uniqueImagePaths(paths);
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
