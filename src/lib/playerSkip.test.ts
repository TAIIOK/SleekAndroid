import { describe, expect, it } from 'vitest';

import {
  EMPTY_SKIP_SEGMENTS,
  sameSkipSegments,
  type PlayerSkipSegment,
} from './playerSkip';

const opening: PlayerSkipSegment = {
  id: 'opening',
  type: 'opening',
  title: 'Пропустить опенинг',
  start: 0,
  end: 90,
};

describe('sameSkipSegments', () => {
  it('treats identical references as equal', () => {
    expect(sameSkipSegments(EMPTY_SKIP_SEGMENTS, EMPTY_SKIP_SEGMENTS)).toBe(true);
  });

  it('treats empty arrays as equal even with different identity', () => {
    expect(sameSkipSegments([], EMPTY_SKIP_SEGMENTS)).toBe(true);
  });

  it('compares id, type, start, and end', () => {
    expect(sameSkipSegments([opening], [{ ...opening }])).toBe(true);
    expect(sameSkipSegments([opening], [{ ...opening, start: 1 }])).toBe(false);
  });
});
