import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchAnimeProgress = vi.fn();
const fetchLampaProgress = vi.fn();
const putAnimeProgress = vi.fn();
const putLampaProgress = vi.fn();

const storage = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => storage.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      storage.set(key, value);
    },
  },
}));

vi.mock('@/api/progress', () => ({
  fetchAnimeProgress: (...args: unknown[]) => fetchAnimeProgress(...args),
  fetchLampaProgress: (...args: unknown[]) => fetchLampaProgress(...args),
  putAnimeProgress: (...args: unknown[]) => putAnimeProgress(...args),
  putLampaProgress: (...args: unknown[]) => putLampaProgress(...args),
}));

import { enqueueLampaProgress, flushProgressQueue } from './progressQueue';

describe('flushProgressQueue', () => {
  beforeEach(() => {
    storage.clear();
    fetchAnimeProgress.mockReset();
    fetchLampaProgress.mockReset();
    putAnimeProgress.mockReset();
    putLampaProgress.mockReset();
  });

  it('drops queued PUT when server already has newer progress for the title', async () => {
    const enqueuedAt = Date.parse('2026-07-24T12:00:00.000Z');
    vi.spyOn(Date, 'now').mockReturnValue(enqueuedAt);

    await enqueueLampaProgress({
      lampaId: '1001',
      seasonOrdinal: 1,
      episodeOrdinal: 3,
      progress: 0.4,
      completed: false,
    });

    fetchLampaProgress.mockResolvedValue([
      {
        lampaId: '1001',
        seasonOrdinal: 1,
        episodeOrdinal: 8,
        progress: 1,
        completed: true,
        updatedAt: '2026-07-24T18:00:00.000Z',
      },
    ]);
    putLampaProgress.mockResolvedValue({
      lampaId: '1001',
      seasonOrdinal: 1,
      episodeOrdinal: 3,
      progress: 0.4,
      completed: false,
    });

    const ok = await flushProgressQueue();
    expect(ok).toBe(1);
    expect(putLampaProgress).not.toHaveBeenCalled();
    expect(fetchLampaProgress).toHaveBeenCalledWith('1001');
  });

  it('puts queued item when server has no newer activity', async () => {
    const enqueuedAt = Date.parse('2026-07-24T18:00:00.000Z');
    vi.spyOn(Date, 'now').mockReturnValue(enqueuedAt);

    await enqueueLampaProgress({
      lampaId: '1001',
      seasonOrdinal: 1,
      episodeOrdinal: 3,
      progress: 0.4,
      completed: false,
    });

    fetchLampaProgress.mockResolvedValue([
      {
        lampaId: '1001',
        seasonOrdinal: 1,
        episodeOrdinal: 3,
        progress: 0.2,
        completed: false,
        updatedAt: '2026-07-24T10:00:00.000Z',
      },
    ]);
    putLampaProgress.mockResolvedValue({
      lampaId: '1001',
      seasonOrdinal: 1,
      episodeOrdinal: 3,
      progress: 0.4,
      completed: false,
    });

    const ok = await flushProgressQueue();
    expect(ok).toBe(1);
    expect(putLampaProgress).toHaveBeenCalledTimes(1);
  });
});
