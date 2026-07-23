import type { AnimeListItem } from '@aniverse/types';

interface AnimePosterImage {
  type?: string;
  source?: string;
  optimized?: string;
  thumbnail?: string;
  preview?: string;
}

function pickPosterImageUrl(
  img: AnimePosterImage,
  preferSmall = false,
): string | undefined {
  const candidates = preferSmall
    ? [img.thumbnail, img.preview, img.optimized, img.source]
    : [img.optimized, img.source, img.thumbnail, img.preview];
  return candidates.find((value) => typeof value === 'string' && value.length > 0);
}

/** Normalize API poster field (string, object, or array) to a single path/url. */
export function extractPosterPath(poster: unknown, preferSmall = false): string | undefined {
  if (!poster) return undefined;
  if (typeof poster === 'string') {
    const trimmed = poster.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (Array.isArray(poster)) {
    const match =
      poster.find(
        (entry) =>
          entry &&
          typeof entry === 'object' &&
          (entry as AnimePosterImage).type === 'poster',
      ) ?? poster[0];
    if (!match) return undefined;
    if (typeof match === 'string') return match.trim() || undefined;
    if (typeof match === 'object') {
      return pickPosterImageUrl(match as AnimePosterImage, preferSmall);
    }
    return undefined;
  }
  if (typeof poster === 'object') {
    return pickPosterImageUrl(poster as AnimePosterImage, preferSmall);
  }
  return undefined;
}

export function animePoster(item: { poster?: unknown }): string | undefined {
  return extractPosterPath(item.poster);
}

/** Prefer thumbnail/preview for dense catalog rails. */
export function animePosterForRail(item: { poster?: unknown }): string | undefined {
  return extractPosterPath(item.poster, true);
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
  return {
    id: item.id,
    title: animeTitle(item),
    poster: animePosterForRail(item),
    score: item.score,
  };
}
