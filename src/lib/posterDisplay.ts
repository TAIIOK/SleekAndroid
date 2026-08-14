import { resolvePosterUrl } from '@/lib/config';
import { rewritePosterURL } from '@/lib/imageCdn';
import { isPlausibleImageURL, normalizedAbsoluteURLString } from '@/lib/poster';

/** Normalize a catalog/continue poster string for Image display (before CDN rewrite). */
export function resolveDisplayPosterUrl(poster?: string | null): string | undefined {
  if (typeof poster !== 'string') return undefined;
  const trimmed = poster.trim();
  if (!trimmed) return undefined;
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('//')
  ) {
    const normalized = normalizedAbsoluteURLString(trimmed);
    if (!normalized || !isPlausibleImageURL(normalized)) return undefined;
    return normalized;
  }
  return resolvePosterUrl(trimmed);
}

/** Site `posterUrl` parity: resolve then rewrite yani hosts for the preferred CDN. */
export function displayPosterUrl(poster?: string | null): string | undefined {
  const resolved = resolveDisplayPosterUrl(poster);
  if (!resolved) return undefined;
  return rewritePosterURL(resolved);
}
