import { describe, expect, it } from 'vitest';

import { EMPTY_HOME_CONFIG } from '@aniverse/catalog';
import { firstVisibleLampaSection, lampaItemsQueryKey } from './lampaBrowse';

describe('firstVisibleLampaSection', () => {
  const sections = [
    { endpoint: 'trending', title: 'В тренде' },
    { endpoint: 'popular', title: 'Популярное' },
    { endpoint: 'now_playing', title: 'Сейчас в кино' },
  ];

  it('returns the first section in home-config endpoint order', () => {
    const config = {
      ...EMPTY_HOME_CONFIG,
      configured: true,
      enabledLampaSections: {
        movie: ['now_playing', 'trending'],
        tv: [] as string[],
      },
    };
    expect(firstVisibleLampaSection(sections, 'movie', config)?.endpoint).toBe('now_playing');
  });

  it('returns undefined when there are no sections', () => {
    expect(firstVisibleLampaSection([], 'movie', EMPTY_HOME_CONFIG)).toBeUndefined();
  });
});

describe('lampaItemsQueryKey', () => {
  it('includes endpoint, urlPath, page size, and CJK flag', () => {
    expect(
      lampaItemsQueryKey(
        'movie',
        { endpoint: 'popular', fetch: { urlPath: '/popular' } },
        12,
        true,
      ),
    ).toEqual(['lampa-items', 'movie', 'popular', '/popular', 12, true]);
  });
});
