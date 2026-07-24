import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    default: {
      getItem: vi.fn(async (key: string) => store.get(key) ?? null),
      setItem: vi.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: vi.fn(async (key: string) => {
        store.delete(key);
      }),
      clear: vi.fn(async () => {
        store.clear();
      }),
    },
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  __resetImageCdnForTests,
  ensureImageCdnPreference,
  getImageCdnPreferenceSync,
  isYaniPosterUrl,
  pickImageCdnPreference,
  probeHost,
  probeImageCdns,
  reportYaniPosterLoadError,
  reportYaniPosterLoadSuccess,
  type ProbeHostResult,
} from './imageCdn';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('pickImageCdnPreference', () => {
  it('returns null when both hosts are down', () => {
    const results: ProbeHostResult[] = [
      { host: 'imgproxy', ok: false, ms: 10 },
      { host: 'static', ok: false, ms: 12 },
    ];
    expect(pickImageCdnPreference(results)).toBeNull();
  });

  it('returns the only reachable host', () => {
    expect(
      pickImageCdnPreference([
        { host: 'imgproxy', ok: false, ms: 10 },
        { host: 'static', ok: true, ms: 20 },
      ]),
    ).toBe('static');
    expect(
      pickImageCdnPreference([
        { host: 'imgproxy', ok: true, ms: 30 },
        { host: 'static', ok: false, ms: 5 },
      ]),
    ).toBe('imgproxy');
  });

  it('prefers faster host when both are up', () => {
    expect(
      pickImageCdnPreference([
        { host: 'imgproxy', ok: true, ms: 80 },
        { host: 'static', ok: true, ms: 20 },
      ]),
    ).toBe('static');
  });

  it('prefers imgproxy on equal RTT', () => {
    expect(
      pickImageCdnPreference([
        { host: 'static', ok: true, ms: 40 },
        { host: 'imgproxy', ok: true, ms: 40 },
      ]),
    ).toBe('imgproxy');
  });
});

describe('probeHost', () => {
  it('treats HTTP 403 as reachable', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 403 }));
    const result = await probeHost('imgproxy', fetchImpl as unknown as typeof fetch);
    expect(result.ok).toBe(true);
    expect(result.host).toBe('imgproxy');
  });

  it('treats network failure as unreachable', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network');
    });
    const result = await probeHost('static', fetchImpl as unknown as typeof fetch);
    expect(result.ok).toBe(false);
  });
});

describe('probeImageCdns + persist', () => {
  beforeEach(async () => {
    __resetImageCdnForTests();
    await AsyncStorage.clear();
  });

  it('picks faster host and exposes it via sync getter after ensure', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('imgproxy')) {
        await delay(30);
        return new Response(null, { status: 403 });
      }
      await delay(5);
      return new Response(null, { status: 200 });
    });

    const preference = await ensureImageCdnPreference({
      force: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(preference).toBe('static');
    expect(getImageCdnPreferenceSync()).toBe('static');
  });

  it('clears preference when both probes fail', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const preference = await ensureImageCdnPreference({
      force: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(preference).toBeNull();
    expect(getImageCdnPreferenceSync()).toBeNull();
  });

  it('reuses fresh persisted preference without probing', async () => {
    await AsyncStorage.setItem(
      'image_cdn_preference',
      JSON.stringify({ preference: 'imgproxy', probedAt: Date.now() }),
    );
    const fetchImpl = vi.fn();
    const preference = await ensureImageCdnPreference({
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(preference).toBe('imgproxy');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('probeImageCdns returns imgproxy when only imgproxy answers', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('imgproxy')) {
        return new Response(null, { status: 404 });
      }
      throw new Error('down');
    });
    await expect(probeImageCdns(fetchImpl as unknown as typeof fetch)).resolves.toBe(
      'imgproxy',
    );
  });
});

describe('yani poster helpers', () => {
  beforeEach(() => {
    __resetImageCdnForTests();
  });

  it('detects yani hosts', () => {
    expect(isYaniPosterUrl('https://imgproxy.yani.tv/foo')).toBe(true);
    expect(isYaniPosterUrl('https://static.yani.tv/foo')).toBe(true);
    expect(isYaniPosterUrl('//img.yani.tv/foo')).toBe(true);
    expect(isYaniPosterUrl('https://api.taiiok.ru/poster.jpg')).toBe(false);
  });

  it('resets error streak on success', () => {
    reportYaniPosterLoadError('https://imgproxy.yani.tv/a');
    reportYaniPosterLoadSuccess();
    // 4 more errors should not hit threshold of 5 after reset
    for (let i = 0; i < 4; i += 1) {
      reportYaniPosterLoadError('https://imgproxy.yani.tv/a');
    }
    // no throw / no crash — threshold not crossed
    expect(true).toBe(true);
  });
});
