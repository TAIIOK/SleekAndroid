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
  buildLampaPlaybackState,
  explicitResumeProgress,
  formatProgressLabel,
  hasMeaningfulProgress,
  isUnfinishedProgress,
  pickLatestUnfinishedAnimeRow,
  pickLatestUnfinishedLampaRow,
  resumeSeekTimeSec,
} from './progressUtils';
import type { UserAnimeProgress, UserLampaProgress } from '../types/progress';
import type { LampaDetail } from '@/api/catalog';

describe('isUnfinishedProgress', () => {
  it('rejects stubs and near-end', () => {
    expect(isUnfinishedProgress(0.0004)).toBe(false);
    expect(isUnfinishedProgress(0.99)).toBe(false);
  });

  it('accepts mid progress even when API completed flag is set at 90%', () => {
    expect(isUnfinishedProgress(0.4)).toBe(true);
    expect(isUnfinishedProgress(0.002)).toBe(true);
    expect(isUnfinishedProgress(0.92, true)).toBe(true);
  });
});

describe('hasMeaningfulProgress', () => {
  it('keeps 90–100% and completed rows for Continue Watching', () => {
    expect(hasMeaningfulProgress(0.9, true)).toBe(true);
    expect(hasMeaningfulProgress(1, true)).toBe(true);
    expect(hasMeaningfulProgress(0.95)).toBe(true);
    expect(hasMeaningfulProgress(0.0004)).toBe(false);
  });
});

describe('explicitResumeProgress', () => {
  it('passes 90–100% through for Continue Watching', () => {
    expect(explicitResumeProgress(0.0004)).toBeUndefined();
    expect(explicitResumeProgress(0.4)).toBe(0.4);
    expect(explicitResumeProgress(0.92)).toBe(0.92);
    expect(explicitResumeProgress(0.99)).toBe(0.99);
    expect(explicitResumeProgress(1)).toBe(1);
  });
});

describe('resumeSeekTimeSec', () => {
  it('seeks to the saved fraction including 90%+', () => {
    expect(resumeSeekTimeSec(1000, undefined, 0.4)).toBe(400);
    expect(resumeSeekTimeSec(1000, undefined, 0.92)).toBe(920);
    expect(resumeSeekTimeSec(1000, 250)).toBe(250);
  });

  it('keeps 100% one second before the end', () => {
    expect(resumeSeekTimeSec(1000, undefined, 1)).toBe(999);
    expect(resumeSeekTimeSec(1000, 1000)).toBe(999);
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

  it('keeps latest completed episode as resume target for Continue CTA', () => {
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
    expect(state.lastProgress).toBe(1);
    expect(state.hasHistory).toBe(true);
  });
});

describe('formatProgressLabel', () => {
  it('hides stubs and shows percent or completed', () => {
    expect(formatProgressLabel(0)).toBeNull();
    expect(formatProgressLabel(0.0004)).toBeNull();
    expect(formatProgressLabel(0.42)).toBe('42%');
    expect(formatProgressLabel(0.92)).toBe('92%');
    expect(formatProgressLabel(0.98)).toBe('Просмотрено');
  });
});

describe('buildLampaPlaybackState', () => {
  it('matches progress keyed by TMDB/route id when detail.objectId is a UUID', () => {
    const detail = {
      id: 'uuid-office-detail',
      objectId: 'uuid-office-object',
      tmdbId: 2316,
      title: 'The Office',
    } as LampaDetail;

    const state = buildLampaPlaybackState(
      [],
      detail,
      [
        {
          lampaId: '2316',
          seasonOrdinal: 2,
          episodeOrdinal: 5,
          progress: 0.37,
          completed: false,
          updatedAt: '2026-07-24T12:00:00.000Z',
        },
      ],
      '2316',
    );

    expect(state.hasHistory).toBe(true);
    expect(state.lastSeason).toBe(2);
    expect(state.lastEpisode).toBe(5);
    expect(state.lastProgress).toBeCloseTo(0.37);
    expect(state.episodeProgressByKey['2-5']).toBeCloseTo(0.37);
  });

  it('matches progress keyed by history UUID when detail only has TMDB route id', () => {
    const detail = {
      id: 2316,
      objectId: 'uuid-detail-other',
      tmdbId: 2316,
      title: 'The Office',
    } as LampaDetail;

    const state = buildLampaPlaybackState(
      [],
      detail,
      [
        {
          lampaId: 'uuid-progress-office',
          seasonOrdinal: 1,
          episodeOrdinal: 3,
          progress: 0.55,
          completed: false,
          updatedAt: '2026-07-24T12:00:00.000Z',
        },
      ],
      '2316',
      [
        {
          lampaId: 'uuid-progress-office',
          tmdbId: 2316,
          snapshot: { title: 'The Office', tmdbId: 2316, kind: 'tv' },
        },
      ],
    );

    expect(state.hasHistory).toBe(true);
    expect(state.lastSeason).toBe(1);
    expect(state.lastEpisode).toBe(3);
    expect(state.lastProgress).toBeCloseTo(0.55);
    expect(state.episodeProgressByKey['1-3']).toBeCloseTo(0.55);
  });

  it('does not treat UUID-only history of another title as this title', () => {
    const detail = {
      id: 9999,
      tmdbId: 9999,
      title: 'New Movie',
    } as LampaDetail;

    const state = buildLampaPlaybackState(
      [],
      detail,
      [
        {
          lampaId: 'uuid-other-show',
          seasonOrdinal: 1,
          episodeOrdinal: 1,
          progress: 0.4,
          completed: false,
          updatedAt: '2026-07-24T12:00:00.000Z',
        },
      ],
      '9999',
      [
        {
          lampaId: 'uuid-other-show',
          snapshot: { title: 'Other Show' },
        },
      ],
    );

    expect(state.hasHistory).toBe(false);
    expect(state.lastProgress).toBe(0);
    expect(state.episodeProgressByKey).toEqual({});
  });
});
