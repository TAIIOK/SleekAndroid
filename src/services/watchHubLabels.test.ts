import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-constants', () => ({
  default: { expoConfig: { extra: {} } },
}));

import {
  disambiguateDuplicateLabels,
  watchHubSourceKey,
  watchHubSourceLabel,
  watchHubSourceSubtitle,
  watchHubTranslatorKey,
  type WatchHubSourceResult,
  type WatchHubTranslator,
} from './watchHub';

const kinobase = (overrides: Partial<WatchHubSourceResult> = {}): WatchHubSourceResult => ({
  title: 'Kinobase',
  url: 'https://kinobase.example/a',
  source_id: 'Kinobase',
  ...overrides,
});

describe('watchHubSourceKey', () => {
  it('keeps two Kinobase rows distinct', () => {
    const a = kinobase({ url: 'https://kinobase.example/a' });
    const b = kinobase({ url: 'https://kinobase.example/b' });
    expect(watchHubSourceKey(a, 0)).not.toBe(watchHubSourceKey(b, 1));
    expect(watchHubSourceKey(a, 0)).not.toBe(watchHubSourceKey(a, 1));
  });
});

describe('watchHubTranslatorKey', () => {
  it('keeps same-name translators distinct', () => {
    const a: WatchHubTranslator = { id: 1, name: 'Дубляж' };
    const b: WatchHubTranslator = { id: 2, name: 'Дубляж' };
    expect(watchHubTranslatorKey(a, 0)).not.toBe(watchHubTranslatorKey(b, 1));
  });
});

describe('watchHubSourceSubtitle', () => {
  it('prefers year / country / genre', () => {
    expect(
      watchHubSourceSubtitle(
        kinobase({ data: { year: 2019, country: 'США', genre: 'драма' } }),
      ),
    ).toBe('2019 · США · драма');
  });

  it('falls back to a distinct title', () => {
    expect(watchHubSourceSubtitle(kinobase({ title: 'Another Match' }))).toBe('Another Match');
  });
});

describe('disambiguateDuplicateLabels', () => {
  it('numbers colliding titles and leaves unique ones alone', () => {
    expect(
      disambiguateDuplicateLabels([
        { label: watchHubSourceLabel(kinobase()) },
        { label: watchHubSourceLabel(kinobase()) },
        { label: 'HDRezka' },
      ]).map((item) => item.label),
    ).toEqual(['Kinobase (1)', 'Kinobase (2)', 'HDRezka']);
  });
});
