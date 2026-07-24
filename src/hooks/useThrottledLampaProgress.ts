import { useCallback, useEffect, useRef } from 'react';

import { putLampaProgress } from '@/api/progress';
import { isEpisodeCompleted, lampaSeasonEpisodeForWatch } from '@/lib/progressUtils';
import { queryClient } from '@/providers/QueryProvider';
import type { LampaProgressPut } from '@/types/progress';

const DEFAULT_SYNC_INTERVAL_MS = 20_000;

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

  enabledRef.current = enabled;

  useEffect(() => {
    const coords = lampaSeasonEpisodeForWatch(isSerial, season, episode);
    const pending = pendingRef.current;
    if (
      pending &&
      coords &&
      !sameLampaCoords(pending, coords.seasonOrdinal, coords.episodeOrdinal, lampaId.trim())
    ) {
      void putLampaProgress(pending);
    }
    lastSyncRef.current = 0;
    pendingRef.current = null;
    completedSentRef.current = false;
    awaitingFreshRef.current = true;
  }, [lampaId, isSerial, season, episode]);

  useEffect(() => {
    return () => {
      if (pendingRef.current) {
        void putLampaProgress(pendingRef.current).finally(() => {
          void queryClient.invalidateQueries({ queryKey: ['lampa-progress'] });
        });
      }
    };
  }, []);

  const flush = useCallback(() => {
    if (!enabledRef.current) return;
    const pending = pendingRef.current;
    if (!pending) return;
    lastSyncRef.current = Date.now();
    void putLampaProgress(pending);
  }, []);

  const sync = useCallback(
    (current: number, duration: number) => {
      if (!enabled || !lampaId.trim()) return;
      // Never invent duration (old 1440s fallback inflated continue-watching %).
      if (!(duration > 1) || !(current >= 0)) return;

      const coords = lampaSeasonEpisodeForWatch(isSerial, season, episode);
      if (!coords) return;

      const progress = Math.min(1, Math.max(0, current / duration));

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
        // Do not invalidate queries while watching — refetches compete with 4K I/O.
        // Cache refresh happens on unmount flush below.
        void putLampaProgress(payload);
      }
    },
    [enabled, lampaId, isSerial, season, episode, intervalMs],
  );

  return { sync, flush };
}
