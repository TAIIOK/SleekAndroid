import type { AnimeListItem } from '@aniverse/types';

interface AnimePosterImage {
  type?: string;
  source?: string;
  optimized?: string;
  thumbnail?: string;
  preview?: string;
}

function pickPosterImageUrl(img: AnimePosterImage): string | undefined {
  const candidates = [img.optimized, img.source, img.thumbnail, img.preview];
  return candidates.find((value) => typeof value === 'string' && value.length > 0);
}

/** Normalize API poster field (string, object, or array) to a single path/url. */
export function extractPosterPath(poster: unknown): string | undefined {
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
    if (typeof match === 'object') return pickPosterImageUrl(match as AnimePosterImage);
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

export function mapAnimeToRailItem(item: AnimeListItem) {
  return {
    id: item.id,
    title: item.title ?? 'Без названия',
    poster: animePoster(item),
    score: item.score,
  };
}
