import { describe, expect, it } from 'vitest';

import type { PlayerEpisodeNavItem } from '@/components/player/types';
import { buildEpisodeSections } from './playerEpisodeSections';

function item(
  id: number,
  extras: Partial<PlayerEpisodeNavItem> = {},
): PlayerEpisodeNavItem {
  return { id, label: `Эпизод ${id}`, number: id, ...extras };
}

describe('buildEpisodeSections', () => {
  it('returns a single unlabeled section when no season is set', () => {
    const items = [item(1), item(2), item(3)];
    expect(buildEpisodeSections(items)).toEqual([
      {
        season: undefined,
        items: [
          { item: items[0], index: 0 },
          { item: items[1], index: 1 },
          { item: items[2], index: 2 },
        ],
      },
    ]);
  });

  it('keeps one section when every item shares the same season', () => {
    const items = [item(1, { season: 1 }), item(2, { season: 1 })];
    const sections = buildEpisodeSections(items);
    expect(sections).toHaveLength(1);
    expect(sections[0]?.season).toBe(1);
    expect(sections[0]?.items.map(({ item: ep }) => ep.id)).toEqual([1, 2]);
  });

  it('groups and sorts multiple seasons, preserving original indices', () => {
    const items = [
      item(11, { season: 2, number: 1 }),
      item(1, { season: 1, number: 1 }),
      item(12, { season: 2, number: 2 }),
      item(2, { season: 1, number: 2 }),
    ];
    const sections = buildEpisodeSections(items);
    expect(sections.map((section) => section.season)).toEqual([1, 2]);
    expect(sections[0]?.items.map(({ item: ep, index }) => [ep.id, index])).toEqual([
      [1, 1],
      [2, 3],
    ]);
    expect(sections[1]?.items.map(({ item: ep, index }) => [ep.id, index])).toEqual([
      [11, 0],
      [12, 2],
    ]);
  });

  it('returns an empty unlabeled section for an empty list', () => {
    expect(buildEpisodeSections([])).toEqual([{ season: undefined, items: [] }]);
  });
});
