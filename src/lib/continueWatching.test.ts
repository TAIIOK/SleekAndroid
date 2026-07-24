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
        progress: 0.95,
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
});
