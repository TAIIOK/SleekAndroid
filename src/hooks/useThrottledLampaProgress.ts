import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { putLampaProgress } from '@/api/progress';
import { patchLampaProgressCache } from '@/lib/progressCache';
import {
  lampaPlaybackDurationKey,
  getPlaybackDuration,
  rememberPlaybackDuration,
} from '@/lib/playbackDurationStore';
import { isEpisodeCompleted, lampaSeasonEpisodeForWatch } from '@/lib/progressUtils';
import { queryClient } from '@/providers/QueryProvider';
import type { LampaProgressPut } from '@/types/progress';

/** Frequent enough for short sessions; exit/background flush covers the rest. */
const DEFAULT_SYNC_INTERVAL_MS = 5_000;
/** Cap for duration-unknown heuristic — never mark completed from a guess. */
const HEURISTIC_PROGRESS_CAP = 0.89;

function invalidateLampaProgress(): void {
  void queryClient.invalidateQueries({ queryKey: ['lampa-progress'] });
}

function sameLampaCoords(
  a: LampaProgressPut | null,
  seasonOrdinal: number,
  episodeOrdinal: number,
  lampaId: string,
): boolean {
  if (!a) return false;
  return (
    a.lampaId === lampaId &&
    a.seasonOrdinal === seasonOrdinal &&
    a.episodeOrdinal === episodeOrdinal
  );
}

async function writeLampaProgress(payload: LampaProgressPut, invalidate: boolean): Promise<void> {
  patchLampaProgressCache(payload);
  await putLampaProgress(payload);
  if (invalidate) invalidateLampaProgress();
}

export function useThrottledLampaProgress(
  enabled: boolean,
  lampaId: string,
  isSerial: boolean,
  season?: number,
  episode?: number,
  intervalMs = DEFAULT_SYNC_INTERVAL_MS,
) {
  const lastSyncRef = useRef(0);
  const pendingRef = useRef<LampaProgressPut | null>(null);
  const completedSentRef = useRef(false);
  /** After episode switch, ignore near-end ticks from the previous source. */
  const awaitingFreshRef = useRef(false);
  const enabledRef = useRef(enabled);
  const writingRef = useRef<Promise<void> | null>(null);

  enabledRef.current = enabled;

  useEffect(() => {
    const coords = lampaSeasonEpisodeForWatch(isSerial, season, episode);
    const pending = pendingRef.current;
    if (
      pending &&
      coords &&
      !sameLampaCoords(pending, coords.seasonOrdinal, coords.episodeOrdinal, lampaId.trim())
    ) {
      void writeLampaProgress(pending, true);
    }
    lastSyncRef.current = 0;
    pendingRef.current = null;
    completedSentRef.current = false;
    awaitingFreshRef.current = true;
  }, [lampaId, isSerial, season, episode]);

  const flush = useCallback(async () => {
    if (!enabledRef.current) return;
    const pending = pendingRef.current;
    if (!pending) {
      if (writingRef.current) await writingRef.current;
      return;
    }
    lastSyncRef.current = Date.now();
    const write = writeLampaProgress(pending, true);
    writingRef.current = write;
    try {
      await write;
    } finally {
      if (writingRef.current === write) writingRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pendingRef.current) {
        void writeLampaProgress(pendingRef.current, true);
      }
    };
  }, []);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        void flush();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [flush]);

  const sync = useCallback(
    (current: number, duration: number) => {
      if (!enabled || !lampaId.trim()) return;
      if (!(current >= 0) || !Number.isFinite(current)) return;

      const coords = lampaSeasonEpisodeForWatch(isSerial, season, episode);
      if (!coords) return;

      let progress: number;
      if (duration > 1) {
        progress = Math.min(1, Math.max(0, current / duration));
        rememberPlaybackDuration(
          lampaPlaybackDurationKey(lampaId.trim(), coords.seasonOrdinal, coords.episodeOrdinal),
          duration,
        );
      } else if (current > 1) {
        const stored = getPlaybackDuration(
          lampaPlaybackDurationKey(lampaId.trim(), coords.seasonOrdinal, coords.episodeOrdinal),
        );
        if (stored != null && stored > 1) {
          progress = Math.min(1, Math.max(0, current / stored));
        } else {
          // Duration briefly unknown — never complete from guess.
          progress = Math.min(HEURISTIC_PROGRESS_CAP, Math.max(0, current / 1440));
        }
      } else {
        return;
      }

      // Auto-next can leave the player emitting the previous episode's end position
      // under the new season/episode — never write that as an initial/completed sync.
      if (awaitingFreshRef.current) {
        if (isEpisodeCompleted(progress)) return;
        awaitingFreshRef.current = false;
      }

      const completed = isEpisodeCompleted(progress);
      const payload: LampaProgressPut = {
        lampaId: lampaId.trim(),
        seasonOrdinal: coords.seasonOrdinal,
        episodeOrdinal: coords.episodeOrdinal,
        progress,
        completed,
      };
      pendingRef.current = payload;

      const now = Date.now();
      const shouldSyncCompleted = completed && !completedSentRef.current;
      const shouldSyncInterval = now - lastSyncRef.current >= intervalMs;
      const shouldSyncInitial = lastSyncRef.current === 0;

      if (shouldSyncInitial || shouldSyncCompleted || shouldSyncInterval) {
        lastSyncRef.current = now;
        if (completed) completedSentRef.current = true;
        void putLampaProgress(payload).then(() => patchLampaProgressCache(payload));
      }
    },
    [enabled, lampaId, isSerial, season, episode, intervalMs],
  );

  return { sync, flush };
}
