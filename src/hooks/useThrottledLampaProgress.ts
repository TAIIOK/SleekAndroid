import { useCallback, useEffect, useRef } from 'react';

import { putLampaProgress } from '@/api/progress';
import { isEpisodeCompleted, lampaSeasonEpisodeForWatch } from '@/lib/progressUtils';
import { queryClient } from '@/providers/QueryProvider';
import type { LampaProgressPut } from '@/types/progress';

const DEFAULT_SYNC_INTERVAL_MS = 20_000;

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

  useEffect(() => {
    lastSyncRef.current = 0;
    pendingRef.current = null;
    completedSentRef.current = false;
  }, [lampaId, season, episode]);

  useEffect(() => {
    return () => {
      if (pendingRef.current) {
        void putLampaProgress(pendingRef.current).finally(() => {
          void queryClient.invalidateQueries({ queryKey: ['lampa-progress'] });
        });
      }
    };
  }, []);

  return useCallback(
    (current: number, duration: number) => {
      if (!enabled || !lampaId.trim()) return;
      // Never invent duration (old 1440s fallback inflated continue-watching %).
      if (!(duration > 1) || !(current >= 0)) return;

      const coords = lampaSeasonEpisodeForWatch(isSerial, season, episode);
      if (!coords) return;

      const progress = Math.min(1, Math.max(0, current / duration));
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
        // Do not invalidate queries while watching — refetches compete with 4K I/O.
        // Cache refresh happens on unmount flush below.
        void putLampaProgress(payload);
      }
    },
    [enabled, lampaId, isSerial, season, episode, intervalMs],
  );
}
