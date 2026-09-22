import { describe, expect, it } from 'vitest';

import {
  resolveHeldTvGridWindow,
  resolveHeldTvRailWindow,
  slideTvRailWindow,
  TV_RAIL_FOCUS_RADIUS,
} from '@/lib/tvRailWindow';

describe('resolveHeldTvRailWindow', () => {
  it('mounts the focused card and three neighbors on each side', () => {
    expect(slideTvRailWindow(0, 20)).toEqual({
      start: 0,
      end: TV_RAIL_FOCUS_RADIUS * 2 + 1,
    });
  });

  it('does not remount while focus stays inside the window', () => {
    const initial = slideTvRailWindow(0, 20);
    expect(resolveHeldTvRailWindow(2, 20, initial)).toBe(initial);
  });

  it('slides when focus reaches the last mounted card and more remain', () => {
    const initial = slideTvRailWindow(0, 20);
    const next = resolveHeldTvRailWindow(initial.end - 1, 20, initial);
    expect(next.start).toBeGreaterThan(initial.start);
  });
});

describe('resolveHeldTvGridWindow', () => {
  it('keeps three rows and does not grow with the full list', () => {
    const window = resolveHeldTvGridWindow(0, 80, 5, null);
    expect(window.end - window.start).toBeLessThanOrEqual(15);
    expect(window.end).toBeLessThan(80);
  });

  it('holds the window while focus stays on the middle row', () => {
    const initial = resolveHeldTvGridWindow(20, 80, 5, null);
    expect(resolveHeldTvGridWindow(20, 80, 5, initial)).toBe(initial);
    expect(initial.end - initial.start).toBe(15);
  });
});
