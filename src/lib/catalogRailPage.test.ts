import { describe, expect, it } from 'vitest';

import { capDetailRailItems, DETAIL_TV_RAIL_CAP } from '@/lib/catalogRailPage';

describe('capDetailRailItems', () => {
  it('caps phone and TV lists at the detail rail limit', () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    expect(capDetailRailItems(items)).toEqual(items.slice(0, DETAIL_TV_RAIL_CAP));
  });

  it('leaves shorter lists unchanged', () => {
    const items = Array.from({ length: 4 }, (_, i) => i);
    expect(capDetailRailItems(items)).toBe(items);
  });
});
