import { describe, expect, it } from 'vitest';

import { capDetailRailItems, DETAIL_TV_RAIL_CAP } from '@/lib/catalogRailPage';

describe('capDetailRailItems', () => {
  it('leaves phone lists unchanged', () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    expect(capDetailRailItems(items, false)).toBe(items);
  });

  it('caps TV lists at the detail rail limit', () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    expect(capDetailRailItems(items, true)).toEqual(items.slice(0, DETAIL_TV_RAIL_CAP));
  });
});
