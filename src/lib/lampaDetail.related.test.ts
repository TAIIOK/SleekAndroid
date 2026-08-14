import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Platform: { OS: 'android', select: (spec: Record<string, unknown>) => spec.android ?? spec.default },
}));

vi.mock('expo-constants', () => ({
  default: { expoConfig: { extra: {} } },
}));

vi.mock('@/lib/isTvUi', () => ({
  isTvUi: () => false,
}));

import type { LampaItem } from '@/api/catalog';
import {
  excludeRelatedLampaItems,
  lampaCardSubtitle,
  lampaCollectionId,
  mergeLampaWithTmdb,
  sortLampaItemsByYear,
} from './lampaDetail';

function item(
  id: number,
  extra?: Partial<LampaItem> & { release_date?: string; first_air_date?: string; year?: number },
): LampaItem {
  return { id, ...extra } as LampaItem;
}

describe('sortLampaItemsByYear', () => {
  it('sorts older titles first and puts missing years last', () => {
    const items: LampaItem[] = [
      item(3, { title: 'C', release_date: '2015-01-01' }),
      item(1, { title: 'A' }),
      item(2, { title: 'B', first_air_date: '2008-06-01' }),
      item(4, { title: 'D', year: 0 }),
    ];

    expect(sortLampaItemsByYear(items).map((entry) => Number(entry.id))).toEqual([2, 3, 1, 4]);
  });
});

describe('excludeRelatedLampaItems', () => {
  it('drops franchise titles from the similar list', () => {
    const similar: LampaItem[] = [
      item(2, { title: 'Prequel' }),
      item(8, { title: 'Same genre' }),
      item(9, { title: 'Another' }),
    ];
    const related: LampaItem[] = [item(2, { title: 'Prequel' })];

    expect(excludeRelatedLampaItems(similar, related).map((entry) => Number(entry.id))).toEqual([
      8, 9,
    ]);
  });
});

describe('lampaCollectionId', () => {
  it('reads snake_case collection id from merged TMDB detail', () => {
    expect(lampaCollectionId({ belongs_to_collection: { id: 10 } })).toBe(10);
  });

  it('reads camelCase collection id', () => {
    expect(lampaCollectionId({ belongsToCollection: { id: 22 } })).toBe(22);
  });

  it('returns undefined without a collection', () => {
    expect(lampaCollectionId({ title: 'Standalone' })).toBeUndefined();
    expect(lampaCollectionId(null)).toBeUndefined();
  });
});

describe('mergeLampaWithTmdb', () => {
  it('keeps belongs_to_collection from TMDB so related fetch can skip a second detail call', () => {
    const merged = mergeLampaWithTmdb(null, { id: 5, belongs_to_collection: { id: 99 } }, 'movie');
    expect(lampaCollectionId(merged.detail)).toBe(99);
  });
});

describe('lampaCardSubtitle', () => {
  it('uses year from release date', () => {
    expect(lampaCardSubtitle({ release_date: '2019-05-17' })).toBe('2019');
  });

  it('returns undefined without a year', () => {
    expect(lampaCardSubtitle({ title: 'No date' } as LampaItem)).toBeUndefined();
  });
});
