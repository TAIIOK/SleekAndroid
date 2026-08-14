import { describe, expect, it, vi } from 'vitest';

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

vi.mock('@/lib/isTvUi', () => ({
  isTvUi: () => false,
}));

import { buildContinueWatchingItems } from './continueWatching';
import {
  animeWatchHistoryKey,
  rememberWatchHistoryMeta,
} from './watchHistoryMeta';
import type { UserAnimeProgress, UserLampaProgress } from '../types/progress';

describe('buildContinueWatchingItems', () => {
  it('does not deep-link to an unfinished episode superseded by a newer completed watch', () => {
    const progress: UserAnimeProgress[] = [
      {
        episodeId: 10,
        animeId: 5,
        progress: 0.3,
        completed: false,
        updatedAt: '2026-07-24T09:00:00.000Z',
      },
      {
        episodeId: 11,
        animeId: 5,
        progress: 0.99,
        completed: true,
        updatedAt: '2026-07-24T10:00:00.000Z',
      },
    ];

    const items = buildContinueWatchingItems(
      [
        {
          id: 5,
          animeId: 5,
          status: 'watching',
          lastWatchingEpisode: 11,
          isFavorite: false,
          title: 'Test Anime',
        },
      ],
      [],
      progress,
      [],
      [],
    );

    expect(items.some((item) => item.kind === 'anime' && item.episodeId === 10)).toBe(false);
    const animeItem = items.find((item) => item.kind === 'anime' && item.animeId === 5);
    expect(animeItem?.episodeId).toBe(11);
    // Near-end episode still opens the player (auto-next / fresh start), not detail.
    expect(animeItem?.startProgress).toBeUndefined();
    expect(animeItem?.href).toBe('/watch/anime/5/11');
    expect(animeItem?.progress).toBe(0.99);
  });

  it('keeps anime on the rail after completing the only watched episode', () => {
    const progress: UserAnimeProgress[] = [
      {
        episodeId: 42,
        animeId: 9,
        progress: 0.99,
        completed: true,
        updatedAt: '2026-07-24T10:00:00.000Z',
      },
    ];

    const items = buildContinueWatchingItems([], [], progress, [], []);
    const animeItem = items.find((item) => item.kind === 'anime' && item.animeId === 9);
    expect(animeItem).toBeTruthy();
    expect(animeItem?.href).toBe('/watch/anime/9/42');
    expect(animeItem?.startProgress).toBeUndefined();
    expect(animeItem?.progress).toBe(0.99);
  });

  it('shows real percent for 90%+ that is still resumable', () => {
    const progress: UserAnimeProgress[] = [
      {
        episodeId: 7,
        animeId: 3,
        progress: 0.92,
        completed: true,
        updatedAt: '2026-07-24T10:00:00.000Z',
      },
    ];

    const items = buildContinueWatchingItems([], [], progress, [], []);
    const animeItem = items.find((item) => item.kind === 'anime' && item.animeId === 3);
    expect(animeItem?.progress).toBe(0.92);
    expect(animeItem?.startProgress).toBe(0.92);
    expect(animeItem?.href).toBe('/watch/anime/3/7');
  });

  it('does not keep Lampa S1E3 when a later episode was completed on another device', () => {
    const lampaProgress: UserLampaProgress[] = [
      {
        lampaId: '1001',
        seasonOrdinal: 1,
        episodeOrdinal: 3,
        progress: 0.4,
        completed: false,
        updatedAt: '2026-07-20T12:00:00.000Z',
      },
      {
        lampaId: '1001',
        seasonOrdinal: 1,
        episodeOrdinal: 8,
        progress: 1,
        completed: true,
        updatedAt: '2026-07-24T20:00:00.000Z',
      },
    ];

    const items = buildContinueWatchingItems(
      [],
      [
        {
          status: 'watching',
          lastEpisode: 8,
          lastSeason: 1,
          lampaObjectId: '1001',
          lampa: {
            objectId: '1001',
            id: 1001,
            tmdbId: 1001,
            kind: 'tv',
            title: 'Banshee',
            poster: '/p.jpg',
          },
        },
      ],
      [],
      lampaProgress,
      [],
    );

    const card = items.find((item) => item.kind === 'tv' && item.title === 'Banshee');
    expect(card).toBeTruthy();
    expect(card?.episode).not.toBe(3);
    expect(card?.episode).toBe(8);
  });

  it('resolves Lampa posters from image objects instead of String(object)', () => {
    const lampaProgress: UserLampaProgress[] = [
      {
        lampaId: '55',
        seasonOrdinal: 0,
        episodeOrdinal: 0,
        progress: 0.4,
        completed: false,
        updatedAt: '2026-08-14T10:00:00.000Z',
      },
    ];

    const items = buildContinueWatchingItems(
      [],
      [
        {
          status: 'watching',
          lampaObjectId: '55',
          lampa: {
            objectId: '55',
            id: 55,
            tmdbId: 55,
            kind: 'movie',
            title: 'Poster Object',
            poster: { source: 'https://image.tmdb.org/t/p/w342/obj.jpg' },
          },
        },
      ],
      [],
      lampaProgress,
      [],
    );

    const card = items.find((item) => item.title === 'Poster Object');
    expect(card?.poster).toBe('https://image.tmdb.org/t/p/w342/obj.jpg');
    expect(card?.poster).not.toContain('[object Object]');
  });

  it('uses local watch-history meta for progress-only anime posters', () => {
    rememberWatchHistoryMeta(animeWatchHistoryKey(77), {
      title: 'Cached Title',
      poster: 'https://static.yani.tv/posters/full/77.jpg',
      kind: 'anime',
    });

    const progress: UserAnimeProgress[] = [
      {
        episodeId: 9,
        animeId: 77,
        progress: 0.4,
        completed: false,
        updatedAt: '2026-08-14T10:00:00.000Z',
      },
    ];

    const items = buildContinueWatchingItems([], [], progress, [], []);
    const card = items.find((item) => item.kind === 'anime' && item.animeId === 77);
    expect(card?.title).toBe('Cached Title');
    expect(card?.poster).toBe('https://static.yani.tv/posters/full/77.jpg');
  });

  it('extracts anime posters from nested catalog poster objects', () => {
    const progress: UserAnimeProgress[] = [
      {
        episodeId: 2,
        animeId: 12,
        progress: 0.4,
        completed: false,
        updatedAt: '2026-08-14T10:00:00.000Z',
      },
    ];

    const items = buildContinueWatchingItems(
      [
        {
          animeId: 12,
          status: 'watching',
          anime: {
            id: 12,
            title: 'Nested Poster',
            poster: [
              { type: 'poster', source: 'https://static.yani.tv/posters/full/12.jpg' },
            ],
          },
        },
      ],
      [],
      progress,
      [],
      [],
    );

    const card = items.find((item) => item.animeId === 12);
    expect(card?.poster).toBe('https://static.yani.tv/posters/full/12.jpg');
    expect(card?.poster).not.toContain('[object Object]');
  });
});
