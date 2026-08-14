import { describe, expect, it } from 'vitest';

import { catalogPagedPath } from '@aniverse/catalog';

describe('catalogPagedPath', () => {
  it('always includes page and limit', () => {
    expect(catalogPagedPath('/api/animes/showcase/trending', 1, 20)).toBe(
      '/api/animes/showcase/trending?page=1&limit=20',
    );
    expect(catalogPagedPath('/api/animes/showcase/trending', 2, 40)).toBe(
      '/api/animes/showcase/trending?page=2&limit=40',
    );
  });

  it('replaces page and limit on a path that already has them', () => {
    expect(
      catalogPagedPath('/api/lampa/tmdb/catalog/movie/section?endpoint=trending&page=1', 1, 12),
    ).toBe('/api/lampa/tmdb/catalog/movie/section?endpoint=trending&page=1&limit=12');
  });
});
