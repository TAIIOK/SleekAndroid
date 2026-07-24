import { useCallback, useEffect, useRef } from 'react';

import { putAnimeProgress } from '@/api/progress';
import { isEpisodeCompleted } from '@/lib/progressUtils';
import { queryClient } from '@/providers/QueryProvider';
import type { AnimeProgressPut } from '@/types/progress';

const DEFAULT_SYNC_INTERVAL_MS = 20_000;

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

  enabledRef.current = enabled;

  useEffect(() => {
    const pending = pendingRef.current;
    if (pending && pending.episodeId !== episodeId) {
      void putAnimeProgress(pending);
    }
    lastSyncRef.current = 0;
    pendingRef.current = null;
    completedSentRef.current = false;
    awaitingFreshRef.current = true;
  }, [episodeId]);

  useEffect(() => {
    return () => {
      if (pendingRef.current) {
        void putAnimeProgress(pendingRef.current).finally(() => {
          void queryClient.invalidateQueries({ queryKey: ['anime-progress'] });
        });
      }
    };
  }, []);

  const flush = useCallback(() => {
    if (!enabledRef.current) return;
    const pending = pendingRef.current;
    if (!pending) return;
    lastSyncRef.current = Date.now();
    void putAnimeProgress(pending);
  }, []);

  const sync = useCallback(
    (current: number, duration: number) => {
      // Require real media duration — never sync against buffer/seekable guesses.
      if (!enabled || !(duration > 1) || !(current >= 0)) return;

      const progress = Math.min(1, Math.max(0, current / duration));

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
        // Cache refresh happens on unmount flush below.
        void putAnimeProgress(payload);
      }
    },
    [enabled, animeId, episodeId, episodeOrdinal, intervalMs],
  );

  return { sync, flush };
}
