import { describe, expect, it } from 'vitest';

import {
  growTvEpisodeWindow,
  TV_EPISODE_WINDOW_INITIAL,
  TV_EPISODE_WINDOW_OVERSCAN,
} from '@/lib/detailEpisodeWindow';

describe('growTvEpisodeWindow', () => {
  it('starts at the initial window and does not shrink', () => {
    expect(growTvEpisodeWindow(8, 0, 24)).toBe(TV_EPISODE_WINDOW_INITIAL);
    expect(growTvEpisodeWindow(12, 0, 24)).toBe(12);
  });

  it('keeps overscan ahead of the focused row', () => {
    expect(growTvEpisodeWindow(8, 5, 24)).toBe(5 + TV_EPISODE_WINDOW_OVERSCAN + 1);
    expect(growTvEpisodeWindow(8, 20, 24)).toBe(24);
  });

  it('caps at the fetched item count', () => {
    expect(growTvEpisodeWindow(8, 40, 12)).toBe(12);
    expect(growTvEpisodeWindow(8, 0, 0)).toBe(0);
  });
});
