import { describe, expect, it } from 'vitest';

import { parseAnimeRecommendationSectionId } from './animeRecommendationSource';

describe('parseAnimeRecommendationSectionId', () => {
  it('reads the showcase id from anime:for_you keys', () => {
    expect(
      parseAnimeRecommendationSectionId({ kind: 'anime', key: 'anime:for_you' }),
    ).toBe('for_you');
  });

  it('ignores custom anime rails', () => {
    expect(
      parseAnimeRecommendationSectionId({
        kind: 'anime',
        key: 'anime:custom:mine',
        animePath: '/api/v2/catalog/recommendations/anime?sections=for_you',
      }),
    ).toBeNull();
  });

  it('parses sections from a recommendation path', () => {
    expect(
      parseAnimeRecommendationSectionId({
        kind: 'anime',
        key: 'anime:personal',
        animePath: '/api/v2/catalog/recommendations/anime?sections=because_you_watched',
      }),
    ).toBe('because_you_watched');
  });

  it('returns null for regular anime lists', () => {
    expect(
      parseAnimeRecommendationSectionId({
        kind: 'anime',
        key: 'anime:trending',
        animePath: '/api/v2/catalog/anime/trending',
      }),
    ).toBeNull();
  });
});
