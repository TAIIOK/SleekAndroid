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

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        apiUrl: 'https://api.taiiok.ru',
        watchHubUrl: 'https://watchhub.taiiok.ru',
        sitePublicUrl: 'https://sleekapp.ru',
      },
    },
  },
}));

import { __resetImageCdnForTests } from './imageCdn';
import { displayPosterUrl, resolveDisplayPosterUrl } from './posterDisplay';

describe('resolveDisplayPosterUrl', () => {
  it('rejects implausible absolute hosts', () => {
    expect(resolveDisplayPosterUrl('https://source2')).toBeUndefined();
  });

  it('normalizes protocol-relative CDN urls', () => {
    expect(resolveDisplayPosterUrl('//imgproxy.yani.tv/a.webp')).toBe(
      'https://imgproxy.yani.tv/a.webp',
    );
  });

  it('keeps plausible https posters', () => {
    expect(resolveDisplayPosterUrl('https://cover.imglib.info/a.jpg')).toBe(
      'https://cover.imglib.info/a.jpg',
    );
  });
});

describe('displayPosterUrl', () => {
  beforeEach(() => {
    __resetImageCdnForTests();
  });

  it('rewrites yani static host to imgproxy when preference is unknown', () => {
    expect(displayPosterUrl('https://static.yani.tv/posters/full/1.jpg')).toBe(
      'https://imgproxy.yani.tv/posters/full/1.jpg',
    );
  });

  it('does not rewrite anilib hotlink hosts', () => {
    expect(displayPosterUrl('https://cover.imglib.info/a.jpg')).toBe(
      'https://cover.imglib.info/a.jpg',
    );
  });
});
