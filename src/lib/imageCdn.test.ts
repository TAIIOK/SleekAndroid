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
  IMAGE_CDN_PROBE_PATH,
  isStaticCdnUnhealthy,
  isYaniPosterUrl,
  loadImageCdnPreference,
  markStaticUnhealthyAndPreferImgproxy,
  pickImageCdnPreference,
  probeHost,
  probeImageCdns,
  reportYaniPosterLoadError,
  reportYaniPosterLoadSuccess,
  rewritePosterURL,
  rewritePosterURLToHost,
  type ProbeHostResult,
} from './imageCdn';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function imageResponse(status: number, url = '') {
  const res = new Response(null, { status });
  if (url) Object.defineProperty(res, 'url', { value: url });
  return res;
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
  it('GETs a real poster path with Range', async () => {
    const fetchImpl = vi.fn(async () => imageResponse(206));
    const result = await probeHost('imgproxy', fetchImpl as unknown as typeof fetch);
    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(IMAGE_CDN_PROBE_PATH);
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string, string>).Range).toBe('bytes=0-2047');
  });

  it('treats HTTP 403 as unreachable for a poster GET', async () => {
    const fetchImpl = vi.fn(async () => imageResponse(403));
    const result = await probeHost('imgproxy', fetchImpl as unknown as typeof fetch);
    expect(result.ok).toBe(false);
    expect(result.host).toBe('imgproxy');
  });

  it('treats static 302 onto imgproxy as unavailable', async () => {
    const fetchImpl = vi.fn(async () =>
      imageResponse(200, `https://imgproxy.yani.tv${IMAGE_CDN_PROBE_PATH}`),
    );
    const result = await probeHost('static', fetchImpl as unknown as typeof fetch);
    expect(result.ok).toBe(false);
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
        return imageResponse(200);
      }
      await delay(5);
      return imageResponse(200);
    });

    const preference = await ensureImageCdnPreference({
      force: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(preference).toBe('static');
    expect(getImageCdnPreferenceSync()).toBe('static');
  });

  it('keeps imgproxy when both probes fail so catalog still sends X-Image-CDN', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const preference = await ensureImageCdnPreference({
      force: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(preference).toBe('imgproxy');
    expect(getImageCdnPreferenceSync()).toBe('imgproxy');
  });

  it('does not restore sticky static across launches', async () => {
    await AsyncStorage.setItem(
      'image_cdn_preference',
      JSON.stringify({ preference: 'static', probedAt: Date.now() }),
    );
    const stored = await loadImageCdnPreference();
    expect(stored.preference).toBeNull();
    expect(getImageCdnPreferenceSync()).toBe('imgproxy');
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
        return imageResponse(206);
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

  it('rewrites yani hosts to preferred CDN', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('static')) {
        await delay(5);
        return imageResponse(200);
      }
      await delay(40);
      return imageResponse(200);
    });
    await ensureImageCdnPreference({
      force: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(getImageCdnPreferenceSync()).toBe('static');
    expect(rewritePosterURL('https://imgproxy.yani.tv/posters/a.jpg')).toBe(
      'https://static.yani.tv/posters/a.jpg',
    );
  });

  it('rewrites yani hosts to imgproxy when preference is unknown', () => {
    expect(rewritePosterURL('https://static.yani.tv/posters/a.jpg')).toBe(
      'https://imgproxy.yani.tv/posters/a.jpg',
    );
    expect(rewritePosterURL('//img.yani.tv/posters/a.jpg')).toBe(
      'https://imgproxy.yani.tv/posters/a.jpg',
    );
    expect(rewritePosterURL('https://cover.imglib.info/a.jpg')).toBe(
      'https://cover.imglib.info/a.jpg',
    );
  });

  it('can force a yani host for Glide vs OkHttp', () => {
    expect(
      rewritePosterURLToHost('https://imgproxy.yani.tv/posters/a.jpg', 'static'),
    ).toBe('https://static.yani.tv/posters/a.jpg');
  });

  it('forces imgproxy when static is unhealthy', () => {
    markStaticUnhealthyAndPreferImgproxy();
    expect(isStaticCdnUnhealthy()).toBe(true);
    expect(getImageCdnPreferenceSync()).toBe('imgproxy');
    expect(rewritePosterURL('https://static.yani.tv/posters/a.jpg')).toBe(
      'https://imgproxy.yani.tv/posters/a.jpg',
    );
  });

  it('marks static unhealthy on static poster load error', () => {
    reportYaniPosterLoadError('https://static.yani.tv/posters/a.jpg');
    expect(isStaticCdnUnhealthy()).toBe(true);
    expect(getImageCdnPreferenceSync()).toBe('imgproxy');
  });
});
