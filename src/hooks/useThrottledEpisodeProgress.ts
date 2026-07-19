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

  useEffect(() => {
    lastSyncRef.current = 0;
    pendingRef.current = null;
    completedSentRef.current = false;
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

  return useCallback(
    (current: number, duration: number) => {
      if (!enabled || !duration) return;

      const progress = Math.min(1, Math.max(0, current / duration));
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
}
