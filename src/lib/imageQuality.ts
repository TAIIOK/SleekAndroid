import type { LampaPosterSize } from '@/lib/config';

const TMDB_IMAGE_SIZE = /\/t\/p\/(?:w\d+|original)(?=\/)/;
const YANI_POSTER_SIZE = /\/posters\/(?:small|medium)(?=\/)/i;

/**
 * Point an existing poster URL at a larger rendition.
 * TMDB paths (`/t/p/w342/…`) change size. Yani `small`/`medium` become `huge`.
 * Other URLs are returned unchanged.
 */
export function higherQualityImageUrl(
  url: string | null | undefined,
  lampaSize: LampaPosterSize = 'w780',
): string | undefined {
  if (!url) return undefined;
  if (TMDB_IMAGE_SIZE.test(url)) {
    return url.replace(TMDB_IMAGE_SIZE, `/t/p/${lampaSize}`);
  }
  if (YANI_POSTER_SIZE.test(url)) {
    return url.replace(YANI_POSTER_SIZE, '/posters/huge');
  }
  return url;
}
