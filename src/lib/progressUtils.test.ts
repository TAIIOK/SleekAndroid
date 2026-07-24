import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Platform: { OS: 'android', select: (spec: Record<string, unknown>) => spec.android ?? spec.default },
}));

vi.mock('expo-constants', () => ({
  default: { expoConfig: { extra: {} } },
}));

vi.mock('@/lib/isTvUi', () => ({
  isTvUi: () => false,
}));

import {
  buildAnimePlaybackState,
  isUnfinishedProgress,
  pickLatestUnfinishedAnimeRow,
  pickLatestUnfinishedLampaRow,
} from './progressUtils';
import type { UserAnimeProgress, UserLampaProgress } from '../types/progress';

describe('isUnfinishedProgress', () => {
  it('rejects stubs and completed', () => {
    expect(isUnfinishedProgress(0.005)).toBe(false);
    expect(isUnfinishedProgress(0.99)).toBe(false);
    expect(isUnfinishedProgress(0.5, true)).toBe(false);
  });

  it('accepts mid progress', () => {
    expect(isUnfinishedProgress(0.4)).toBe(true);
  });
});

describe('pickLatestUnfinishedAnimeRow', () => {
  it('prefers substantial latest updatedAt over tiny stub', () => {
    const rows: UserAnimeProgress[] = [
      {
        episodeId: 3,
        animeId: 1,
        progress: 0.02,
        completed: false,
        updatedAt: '2026-07-24T12:00:00.000Z',
      },
      {
        episodeId: 2,
        animeId: 1,
        progress: 0.4,
        completed: false,
        updatedAt: '2026-07-24T11:00:00.000Z',
      },
    ];
    const picked = pickLatestUnfinishedAnimeRow(rows);
    expect(picked?.episodeId).toBe(2);
  });

  it('ignores unfinished episode superseded by a newer completed watch', () => {
    const rows: UserAnimeProgress[] = [
      {
        episodeId: 3,
        animeId: 1,
        progress: 0.4,
        completed: false,
        updatedAt: '2026-07-24T10:00:00.000Z',
      },
      {
        episodeId: 8,
        animeId: 1,
        progress: 1,
        completed: true,
        updatedAt: '2026-07-24T18:00:00.000Z',
      },
    ];
    expect(pickLatestUnfinishedAnimeRow(rows)).toBeUndefined();
  });

  it('picks newer unfinished episode over older unfinished', () => {
    const rows: UserAnimeProgress[] = [
      {
        episodeId: 3,
        animeId: 1,
        progress: 0.4,
        completed: false,
        updatedAt: '2026-07-24T10:00:00.000Z',
      },
      {
        episodeId: 8,
        animeId: 1,
        progress: 0.55,
        completed: false,
        updatedAt: '2026-07-24T18:00:00.000Z',
      },
    ];
    expect(pickLatestUnfinishedAnimeRow(rows)?.episodeId).toBe(8);
  });
});

describe('pickLatestUnfinishedLampaRow', () => {
  it('ignores S1E3 unfinished when S1E8 was completed later (cross-device)', () => {
    const rows: UserLampaProgress[] = [
      {
        lampaId: 'banshee',
        seasonOrdinal: 1,
        episodeOrdinal: 3,
        progress: 0.42,
        completed: false,
        updatedAt: '2026-07-20T12:00:00.000Z',
      },
      {
        lampaId: 'banshee',
        seasonOrdinal: 1,
        episodeOrdinal: 8,
        progress: 1,
        completed: true,
        updatedAt: '2026-07-24T20:00:00.000Z',
      },
    ];
    expect(pickLatestUnfinishedLampaRow(rows)).toBeUndefined();
  });
});

describe('buildAnimePlaybackState', () => {
  it('uses unfinished progress row over library lastWatchingEpisode', () => {
    const state = buildAnimePlaybackState(
      [
        {
          id: 1,
          animeId: 1,
          status: 'watching',
          lastWatchingEpisode: 3,
          isFavorite: false,
        },
      ],
      1,
      [
        {
          episodeId: 2,
          animeId: 1,
          progress: 0.42,
          completed: false,
          updatedAt: '2026-07-24T10:00:00.000Z',
        },
      ],
    );
    expect(state.lastEpisodeId).toBe(2);
    expect(state.lastProgress).toBeCloseTo(0.42);
  });

  it('falls back to library when unfinished is superseded by completed', () => {
    const state = buildAnimePlaybackState(
      [
        {
          id: 1,
          animeId: 1,
          status: 'watching',
          lastWatchingEpisode: 8,
          isFavorite: false,
        },
      ],
      1,
      [
        {
          episodeId: 3,
          animeId: 1,
          progress: 0.4,
          completed: false,
          updatedAt: '2026-07-20T10:00:00.000Z',
        },
        {
          episodeId: 8,
          animeId: 1,
          progress: 1,
          completed: true,
          updatedAt: '2026-07-24T18:00:00.000Z',
        },
      ],
    );
    expect(state.lastEpisodeId).toBe(8);
    expect(state.lastProgress).toBe(0);
  });
});
