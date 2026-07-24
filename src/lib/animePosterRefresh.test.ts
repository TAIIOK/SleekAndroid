import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/providers/QueryProvider', () => ({
  queryClient: {
    invalidateQueries: vi.fn(),
  },
}));

vi.mock('@/lib/imageCdn', () => ({
  getImageCdnPreferenceSync: vi.fn(() => 'imgproxy'),
}));

const refreshAnimePosters = vi.fn();

vi.mock('@/api/catalog', () => {
  class RefreshPostersRateLimitedError extends Error {
    constructor(readonly retryAfterSeconds: number) {
      super('Rate limit exceeded');
      this.name = 'RefreshPostersRateLimitedError';
    }
  }
  return {
    refreshAnimePosters: (...args: unknown[]) => refreshAnimePosters(...args),
    RefreshPostersRateLimitedError,
  };
});

import { RefreshPostersRateLimitedError } from '@/api/catalog';

import {
  __resetAnimePosterRefreshForTests,
  isReallyDeadPoster,
  reportDeadPoster,
  subscribeAnimePosterRefresh,
} from './animePosterRefresh';

describe('isReallyDeadPoster', () => {
  it('flags implausible absolute URLs', () => {
    expect(
      isReallyDeadPoster({
        failedUrl: null,
        rawPath: 'https://source2',
        preferredHostName: 'imgproxy.yani.tv',
      }),
    ).toBe('unresolvedOrImplausibleURL');
  });

  it('ignores static host failures (CDN reprobe path)', () => {
    expect(
      isReallyDeadPoster({
        failedUrl: 'https://static.yani.tv/posters/huge/1.avif',
        rawPath: 'https://static.yani.tv/posters/huge/1.avif',
        preferredHostName: 'imgproxy.yani.tv',
      }),
    ).toBeNull();
  });

  it('flags preferred host / imgproxy failures', () => {
    expect(
      isReallyDeadPoster({
        failedUrl: 'https://imgproxy.yani.tv/posters/huge/1.avif',
        rawPath: 'https://imgproxy.yani.tv/posters/huge/1.avif',
        preferredHostName: 'imgproxy.yani.tv',
      }),
    ).toBe('preferredHostFailure');
  });
});

describe('reportDeadPoster', () => {
  beforeEach(() => {
    __resetAnimePosterRefreshForTests();
    refreshAnimePosters.mockReset();
  });

  it('emits refreshed poster URL and respects cooldown', async () => {
    refreshAnimePosters.mockResolvedValue({
      deletedCount: 1,
      refreshed: true,
      animeUpdated: true,
      cooldown: false,
      retryAfterSeconds: 900,
      postersCreated: 1,
      posters: [
        {
          source: 'https://static.yani.tv/posters/full/1636891284.jpg',
          optimized: 'https://static.yani.tv/posters/huge/1636667500.avif',
        },
      ],
    });

    const events: Array<{ animeId: number; posterURLString: string }> = [];
    const unsubscribe = subscribeAnimePosterRefresh((event) => events.push(event));

    reportDeadPoster({
      animeId: 9016,
      failedUrl: 'https://imgproxy.yani.tv/posters/huge/1.avif',
      rawPath: 'https://imgproxy.yani.tv/posters/huge/1.avif',
    });

    await vi.waitFor(() => expect(events.length).toBe(1));
    expect(events[0]).toEqual({
      animeId: 9016,
      posterURLString: 'https://static.yani.tv/posters/full/1636891284.jpg',
    });
    expect(refreshAnimePosters).toHaveBeenCalledTimes(1);

    reportDeadPoster({
      animeId: 9016,
      failedUrl: 'https://imgproxy.yani.tv/posters/huge/1.avif',
      rawPath: 'https://imgproxy.yani.tv/posters/huge/1.avif',
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(refreshAnimePosters).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it('pauses globally on 429', async () => {
    refreshAnimePosters.mockRejectedValue(new RefreshPostersRateLimitedError(42));

    reportDeadPoster({
      animeId: 1,
      failedUrl: 'https://imgproxy.yani.tv/a.jpg',
      rawPath: 'https://imgproxy.yani.tv/a.jpg',
    });
    await vi.waitFor(() => expect(refreshAnimePosters).toHaveBeenCalledTimes(1));

    reportDeadPoster({
      animeId: 2,
      failedUrl: 'https://imgproxy.yani.tv/b.jpg',
      rawPath: 'https://imgproxy.yani.tv/b.jpg',
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(refreshAnimePosters).toHaveBeenCalledTimes(1);
  });
});
