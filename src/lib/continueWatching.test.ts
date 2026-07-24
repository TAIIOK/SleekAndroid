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
import type { UserAnimeProgress } from '../types/progress';

describe('buildContinueWatchingItems', () => {
  it('includes unfinished anime progress and skips completed', () => {
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

    expect(items.some((item) => item.kind === 'anime' && item.episodeId === 10)).toBe(true);
    expect(items.some((item) => item.kind === 'anime' && item.episodeId === 11)).toBe(false);
  });
});
