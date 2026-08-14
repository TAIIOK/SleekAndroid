import { isAnimeRecommendationShowcaseId } from '@aniverse/catalog';

/** Section id for `/api/v2/catalog/recommendations/anime?sections=`. */
export function parseAnimeRecommendationSectionId(source: {
  kind: string;
  key: string;
  animePath?: string;
}): string | null {
  if (source.kind !== 'anime') return null;
  if (source.key.startsWith('anime:custom:')) return null;
  const showcaseId = source.key.startsWith('anime:')
    ? source.key.slice('anime:'.length)
    : null;
  if (showcaseId && isAnimeRecommendationShowcaseId(showcaseId)) return showcaseId;
  if (!source.animePath) return null;
  try {
    const url = new URL(source.animePath, 'https://local');
    if (!url.pathname.includes('/catalog/recommendations/anime')) return null;
    return url.searchParams.get('sections');
  } catch {
    return null;
  }
}
