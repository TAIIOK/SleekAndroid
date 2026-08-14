import { describe, expect, it } from 'vitest';

import {
  countdownUnits,
  formatNextEpisodeDateTime,
  nextEpisodeNumber,
  parseNextEpisodeDate,
  remainingParts,
  shouldShowNextEpisode,
} from './nextEpisode';

describe('parseNextEpisodeDate', () => {
  it('parses ISO strings from the catalog API', () => {
    const date = parseNextEpisodeDate('2026-08-14T15:04:05.000Z');
    expect(date?.toISOString()).toBe('2026-08-14T15:04:05.000Z');
  });

  it('parses unix seconds and milliseconds', () => {
    expect(parseNextEpisodeDate(1_787_000_000)?.getTime()).toBe(1_787_000_000_000);
    expect(parseNextEpisodeDate(1_787_000_000_000)?.getTime()).toBe(1_787_000_000_000);
  });

  it('reads camelCase, snake_case and nested airing fields', () => {
    expect(
      parseNextEpisodeDate({ nextEpisodeAt: '2026-08-14T15:04:05.000Z' })?.toISOString(),
    ).toBe('2026-08-14T15:04:05.000Z');
    expect(
      parseNextEpisodeDate({ next_episode_date: '2026-08-14T15:04:05.000Z' })?.toISOString(),
    ).toBe('2026-08-14T15:04:05.000Z');
    expect(
      parseNextEpisodeDate({ nextAiringEpisode: { airingAt: 1_787_000_000 } })?.getTime(),
    ).toBe(1_787_000_000_000);
  });

  it('returns undefined for empty or invalid values', () => {
    expect(parseNextEpisodeDate(undefined)).toBeUndefined();
    expect(parseNextEpisodeDate('')).toBeUndefined();
    expect(parseNextEpisodeDate({ title: 'Naruto' })).toBeUndefined();
  });
});

describe('shouldShowNextEpisode', () => {
  const now = new Date('2026-08-14T12:00:00.000Z');

  it('shows only future dates', () => {
    expect(shouldShowNextEpisode(new Date('2026-08-14T12:00:01.000Z'), now)).toBe(true);
    expect(shouldShowNextEpisode(new Date('2026-08-14T12:00:00.000Z'), now)).toBe(false);
    expect(shouldShowNextEpisode(new Date('2026-08-14T11:59:59.000Z'), now)).toBe(false);
    expect(shouldShowNextEpisode(undefined, now)).toBe(false);
  });
});

describe('nextEpisodeNumber', () => {
  it('is episodesAired + 1 when aired count is known', () => {
    expect(nextEpisodeNumber(12)).toBe(13);
    expect(nextEpisodeNumber(0)).toBe(1);
    expect(nextEpisodeNumber(12.9)).toBe(13);
  });

  it('is omitted when aired count is missing or invalid', () => {
    expect(nextEpisodeNumber(undefined)).toBeUndefined();
    expect(nextEpisodeNumber(-1)).toBeUndefined();
    expect(nextEpisodeNumber(Number.NaN)).toBeUndefined();
  });
});

describe('remainingParts', () => {
  it('splits milliseconds into days, hours, minutes and seconds', () => {
    expect(remainingParts(((2 * 24 + 5) * 3600 + 12 * 60 + 33) * 1000)).toEqual({
      days: 2,
      hours: 5,
      minutes: 12,
      seconds: 33,
      totalMs: ((2 * 24 + 5) * 3600 + 12 * 60 + 33) * 1000,
    });
  });

  it('clamps negative remaining time to zero', () => {
    expect(remainingParts(-1500)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs: 0,
    });
  });
});

describe('countdownUnits', () => {
  it('omits days when remaining time is under 24 hours', () => {
    expect(countdownUnits(remainingParts((5 * 3600 + 12 * 60 + 33) * 1000))).toEqual([
      { value: '05', label: 'ч' },
      { value: '12', label: 'м' },
      { value: '33', label: 'с' },
    ]);
  });

  it('includes padded days when remaining time is a day or more', () => {
    expect(countdownUnits(remainingParts((2 * 86_400 + 5 * 3600) * 1000))).toEqual([
      { value: '02', label: 'д' },
      { value: '05', label: 'ч' },
      { value: '00', label: 'м' },
      { value: '00', label: 'с' },
    ]);
  });
});

describe('formatNextEpisodeDateTime', () => {
  it('formats local date and time in ru-RU', () => {
    const formatted = formatNextEpisodeDateTime(new Date(2026, 7, 14, 18, 0, 0));
    expect(formatted).toContain('14');
    expect(formatted).toMatch(/18:00/);
  });
});
