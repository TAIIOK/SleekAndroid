import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { putAnimeProgress } from '@/api/progress';
import { patchAnimeProgressCache } from '@/lib/progressCache';
import {
  animePlaybackDurationKey,
  getPlaybackDuration,
  rememberPlaybackDuration,
} from '@/lib/playbackDurationStore';
import { isEpisodeCompleted } from '@/lib/progressUtils';
import { queryClient } from '@/providers/QueryProvider';
import type { AnimeProgressPut } from '@/types/progress';

/** Frequent enough for short sessions; exit/background flush covers the rest. */
const DEFAULT_SYNC_INTERVAL_MS = 5_000;
/** Cap for duration-unknown heuristic — never mark completed from a guess. */
const HEURISTIC_PROGRESS_CAP = 0.89;

function invalidateAnimeProgress(): void {
  void queryClient.invalidateQueries({ queryKey: ['anime-progress'] });
}

async function writeAnimeProgress(payload: AnimeProgressPut, invalidate: boolean): Promise<void> {
  patchAnimeProgressCache(payload);
  await putAnimeProgress(payload);
  if (invalidate) invalidateAnimeProgress();
}

export function useThrottledEpisodeProgress(
  enabled: boolean,
  animeId: number,
  episodeId: number,
  episodeOrdinal?: number,
  intervalMs = DEFAULT_SYNC_INTERVAL_MS,
) {
  const lastSyncRef = useRef(0);
  const pendingRef = useRef<AnimeProgressPut | null>(null);
  const completedSentRef = useRef(false);
  /** After episode switch, ignore near-end ticks from the previous source. */
  const awaitingFreshRef = useRef(false);
  const enabledRef = useRef(enabled);
  const writingRef = useRef<Promise<void> | null>(null);

  enabledRef.current = enabled;

  useEffect(() => {
    const pending = pendingRef.current;
    if (pending && pending.episodeId !== episodeId) {
      void writeAnimeProgress(pending, true);
    }
    lastSyncRef.current = 0;
    pendingRef.current = null;
    completedSentRef.current = false;
    awaitingFreshRef.current = true;
  }, [episodeId]);

  const flush = useCallback(async () => {
    if (!enabledRef.current) return;
    const pending = pendingRef.current;
    if (!pending) {
      if (writingRef.current) await writingRef.current;
      return;
    }
    lastSyncRef.current = Date.now();
    const write = writeAnimeProgress(pending, true);
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
        void writeAnimeProgress(pendingRef.current, true);
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
      if (!enabled || !(current >= 0) || !Number.isFinite(current)) return;

      let progress: number;
      if (duration > 1) {
        progress = Math.min(1, Math.max(0, current / duration));
        rememberPlaybackDuration(animePlaybackDurationKey(animeId, episodeId), duration);
      } else if (current > 1) {
        const stored = getPlaybackDuration(animePlaybackDurationKey(animeId, episodeId));
        if (stored != null && stored > 1) {
          progress = Math.min(1, Math.max(0, current / stored));
        } else {
          // Duration briefly unknown (quality reload / HLS) — never complete from guess.
          progress = Math.min(HEURISTIC_PROGRESS_CAP, Math.max(0, current / 1440));
        }
      } else {
        return;
      }

      // Auto-next can leave the player emitting the previous episode's end position
      // under the new episodeId — never write that as an initial/completed sync.
      if (awaitingFreshRef.current) {
        if (isEpisodeCompleted(progress)) return;
        awaitingFreshRef.current = false;
      }

      const completed = isEpisodeCompleted(progress);
      const payload: AnimeProgressPut = {
        animeId,
        episodeId,
        episodeOrdinal,
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
        // Do not invalidate queries while watching — refetches compete with 4K I/O.
        void putAnimeProgress(payload).then(() => patchAnimeProgressCache(payload));
      }
    },
    [enabled, animeId, episodeId, episodeOrdinal, intervalMs],
  );

  return { sync, flush };
}
