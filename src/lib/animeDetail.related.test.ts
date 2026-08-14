import { describe, expect, it } from 'vitest';

import {
  excludeRelatedFromSimilar,
  extractRelatedItems,
  normalizeAnimeRelated,
  sortAnimeItemsByYear,
  type AnimeRelated,
  type AnimeRelatedItem,
} from './animeDetail';

describe('normalizeAnimeRelated', () => {
  it('maps snake_case relation fields from the API', () => {
    const related = normalizeAnimeRelated({
      anime_id: 10,
      related_anime_id: 20,
      relation_type: 'sequel',
      relatedAnime: { id: 20, title: 'Part 2', year: 2012 },
    });

    expect(related.animeId).toBe(10);
    expect(related.relatedAnimeId).toBe(20);
    expect(related.relationType).toBe('sequel');
    expect(related.relatedAnime).toEqual({ id: 20, title: 'Part 2', year: 2012 });
  });

  it('keeps camelCase fields', () => {
    const related = normalizeAnimeRelated({
      animeId: 10,
      relatedAnimeId: 21,
      relationType: 'recommend',
      relatedAnime: { id: 21, title: 'Rec' },
    });

    expect(related.animeId).toBe(10);
    expect(related.relatedAnimeId).toBe(21);
    expect(related.relationType).toBe('recommend');
  });
});

describe('extractRelatedItems', () => {
  const relations: AnimeRelated[] = [
    {
      animeId: 1,
      relatedAnimeId: 2,
      relationType: 'prequel',
      relatedAnime: { id: 2, title: 'Prequel', year: 2006 },
    },
    {
      animeId: 1,
      relatedAnimeId: 3,
      relationType: 'recommend',
      relatedAnime: { id: 3, title: 'Recommended', year: 2018 },
    },
    {
      animeId: 1,
      relatedAnimeId: 4,
      relationType: 'рекомендация',
      relatedAnime: { id: 4, title: 'Also recommended' },
    },
  ];

  it('splits franchise relations away from recommendation rows', () => {
    const related = extractRelatedItems(relations, 1, false);
    const recommended = extractRelatedItems(relations, 1, true);

    expect(related.map((item) => item.id)).toEqual([2]);
    expect(recommended.map((item) => item.id)).toEqual([3, 4]);
  });

  it('accepts snake_case relation rows', () => {
    const related = extractRelatedItems(
      [
        {
          anime_id: 1,
          related_anime_id: 2,
          relation_type: 'sequel',
          relatedAnime: { id: 2, title: 'Part 2', year: 2012 },
        } as AnimeRelated,
      ],
      1,
      false,
    );

    expect(related.map((item) => item.id)).toEqual([2]);
  });

  it('skips the current anime id', () => {
    const items = extractRelatedItems(
      [
        {
          animeId: 2,
          relatedAnimeId: 1,
          relationType: 'sequel',
          anime: { id: 2, title: 'Other' },
          relatedAnime: { id: 1, title: 'Current' },
        },
      ],
      1,
      false,
    );

    expect(items.map((item) => item.id)).toEqual([2]);
  });
});

describe('sortAnimeItemsByYear', () => {
  it('sorts older titles first and puts missing years last', () => {
    const items: AnimeRelatedItem[] = [
      { id: 3, title: 'C', year: 2015 },
      { id: 1, title: 'A' },
      { id: 2, title: 'B', year: 2008 },
      { id: 4, title: 'D', year: 0 },
    ];

    expect(sortAnimeItemsByYear(items).map((item) => item.id)).toEqual([2, 3, 1, 4]);
  });
});

describe('excludeRelatedFromSimilar', () => {
  it('drops franchise titles from the similar list', () => {
    const similar: AnimeRelatedItem[] = [
      { id: 2, title: 'Prequel' },
      { id: 8, title: 'Same genre' },
      { id: 9, title: 'Another' },
    ];
    const related: AnimeRelatedItem[] = [{ id: 2, title: 'Prequel' }];

    expect(excludeRelatedFromSimilar(similar, related).map((item) => item.id)).toEqual([8, 9]);
  });
});
