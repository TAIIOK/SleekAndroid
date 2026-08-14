import { describe, expect, it } from 'vitest';

import { extractRemoteHomeConfig, looksLikeHomeConfig } from './catalogHomeConfigRemote';

const savedConfig = {
  configured: true,
  enabledContentTypes: ['anime', 'lampa'],
  enabledAnimeShowcases: ['recent', 'trending'],
  enabledLampaSections: { movie: ['popular'], tv: ['on_the_air'] },
  homeSectionOrder: ['anime', 'movie', 'tv'],
};

describe('extractRemoteHomeConfig', () => {
  it('reads the standard { data, meta } envelope', () => {
    expect(
      extractRemoteHomeConfig({
        data: savedConfig,
        meta: { updatedAt: '2026-08-01T12:00:00.000Z' },
      }),
    ).toEqual({
      config: savedConfig,
      updatedAt: '2026-08-01T12:00:00.000Z',
    });
  });

  it('parses gin RawMessage when data is a JSON string', () => {
    expect(extractRemoteHomeConfig({ data: JSON.stringify(savedConfig) })).toEqual({
      config: savedConfig,
      updatedAt: undefined,
    });
  });

  it('accepts an already-unwrapped config object', () => {
    expect(extractRemoteHomeConfig(savedConfig)).toEqual({
      config: savedConfig,
      updatedAt: undefined,
    });
  });

  it('treats data: null as no remote config', () => {
    expect(extractRemoteHomeConfig({ data: null, meta: { updatedAt: '2026-08-01T12:00:00.000Z' } })).toEqual({
      config: null,
      updatedAt: '2026-08-01T12:00:00.000Z',
    });
  });

  it('does not treat an empty object as a home config', () => {
    expect(extractRemoteHomeConfig({ data: {} })).toEqual({ config: null, updatedAt: undefined });
    expect(looksLikeHomeConfig({})).toBe(false);
  });
});
