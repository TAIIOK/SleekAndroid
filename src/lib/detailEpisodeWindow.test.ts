import { describe, expect, it } from 'vitest';

import {
  resolveHeldTvEpisodeWindow,
  slideTvEpisodeWindow,
  tvEpisodeWindowSpacerHeights,
  TV_EPISODE_ROW_STRIDE,
  TV_EPISODE_WINDOW_INITIAL,
  TV_EPISODE_WINDOW_OVERSCAN,
} from '@/lib/detailEpisodeWindow';

describe('slideTvEpisodeWindow', () => {
  it('starts at the initial window around the first row', () => {
    expect(slideTvEpisodeWindow(0, 24)).toEqual({
      start: 0,
      end: TV_EPISODE_WINDOW_INITIAL,
    });
  });

  it('keeps overscan behind and ahead of the focused row', () => {
    expect(slideTvEpisodeWindow(5, 24)).toEqual({
      start: 5 - TV_EPISODE_WINDOW_OVERSCAN,
      end: 5 + TV_EPISODE_WINDOW_OVERSCAN + 1,
    });
  });

  it('caps at the fetched item count', () => {
    expect(slideTvEpisodeWindow(40, 12)).toEqual({ start: 7, end: 12 });
    expect(slideTvEpisodeWindow(0, 0)).toEqual({ start: 0, end: 0 });
  });

  it('slides away from the start so far-above rows can unmount', () => {
    expect(slideTvEpisodeWindow(10, 24).start).toBeGreaterThan(0);
    expect(slideTvEpisodeWindow(10, 24).end).toBeLessThan(24);
  });
});

describe('resolveHeldTvEpisodeWindow', () => {
  it('does not move while focus stays inside the mounted rows', () => {
    const initial = slideTvEpisodeWindow(0, 24);
    expect(resolveHeldTvEpisodeWindow(1, 24, initial)).toBe(initial);
    expect(resolveHeldTvEpisodeWindow(initial.end - 2, 24, initial)).toBe(initial);
  });

  it('slides once focus reaches the last mounted row with more below', () => {
    const initial = slideTvEpisodeWindow(0, 24);
    const next = resolveHeldTvEpisodeWindow(initial.end - 1, 24, initial);
    expect(next).not.toBe(initial);
    expect(next.end).toBeGreaterThan(initial.end);
  });

  it('stays put on the first row when nothing is above', () => {
    const initial = slideTvEpisodeWindow(0, 24);
    expect(resolveHeldTvEpisodeWindow(0, 24, initial)).toBe(initial);
  });
});

describe('tvEpisodeWindowSpacerHeights', () => {
  it('keeps total spacer+window height equal to the full list', () => {
    const window = slideTvEpisodeWindow(10, 24);
    const spacers = tvEpisodeWindowSpacerHeights(window.start, window.end, 24);
    expect(spacers.top).toBe(window.start * TV_EPISODE_ROW_STRIDE);
    expect(spacers.bottom).toBe((24 - window.end) * TV_EPISODE_ROW_STRIDE);
    expect(spacers.top + spacers.bottom + (window.end - window.start) * TV_EPISODE_ROW_STRIDE)
      .toBe(24 * TV_EPISODE_ROW_STRIDE);
  });
});
