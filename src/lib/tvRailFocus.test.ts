import { describe, expect, it } from 'vitest';

import { railFocusStealIndex, tvNextFocusLeft } from './tvRailFocus';

describe('railFocusStealIndex', () => {
  it('moves right to the next card', () => {
    expect(railFocusStealIndex(2, 1, 10)).toBe(3);
  });

  it('does not steal left from the first card (sidebar exit)', () => {
    expect(railFocusStealIndex(0, -1, 10)).toBeNull();
  });

  it('keeps the last card when Right would run off the rail', () => {
    expect(railFocusStealIndex(9, 1, 10)).toBe(9);
  });

  it('moves left to the previous card', () => {
    expect(railFocusStealIndex(3, -1, 10)).toBe(2);
  });

  it('returns null for an empty rail', () => {
    expect(railFocusStealIndex(0, 1, 0)).toBeNull();
  });
});

describe('tvNextFocusLeft', () => {
  it('pins Left to the sidebar on a rail-start card', () => {
    expect(tvNextFocusLeft({ railStart: true, exitTag: 9 })).toBe(9);
  });

  it('prefers an in-row dest over the sidebar on a rail-start card', () => {
    expect(tvNextFocusLeft({ railStart: true, exitTag: 9, siblingTag: 3 })).toBe(3);
  });

  it('keeps sibling Left for mid-rail cards', () => {
    expect(tvNextFocusLeft({ railStart: false, exitTag: 9, siblingTag: 3 })).toBe(3);
  });
});
