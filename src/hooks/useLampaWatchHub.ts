import { useCallback, useRef, useState } from 'react';

import type { LampaDetail } from '@/api/catalog';
import { lampaItemTitle } from '@/api/catalog';
import {
  buildTaskRequest,
  createTaskUntilReady,
  fetchExternalIds,
  fetchTranslators,
  fetchVideoLinks,
  fetchWatchHubEpisodes,
  filterReadyWatchHubSources,
  pickStreamUrlFromLinks,
  type WatchHubSeasonEpisodes,
  type WatchHubSourceResult,
  type WatchHubTranslator,
  type WatchHubVideoLink,
} from '@/services/watchHub';

interface UseLampaWatchHubOptions {
  detail: LampaDetail;
  isSerial: boolean;
  routeId?: string;
}

function releaseYear(detail: LampaDetail): string {
  const d = detail as unknown as Record<string, unknown>;
  const raw = d.releaseDate ?? d.release_date ?? d.first_air_date;
  if (!raw) return '0';
  const year = parseInt(String(raw).slice(0, 4), 10);
  return Number.isFinite(year) ? String(year) : '0';
}

function watchHubLookupId(routeId: string, detail: LampaDetail): string {
  const rid = routeId.trim();
  if (rid) return rid;
  const tmdb = (detail as unknown as Record<string, unknown>).tmdbId;
  if (tmdb != null && Number(tmdb) > 0) return String(tmdb);
  if (detail.id != null) return String(detail.id);
  return '';
}

export function useLampaWatchHub({ detail, isSerial, routeId = '' }: UseLampaWatchHubOptions) {
  const [sources, setSources] = useState<WatchHubSourceResult[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const taskIdRef = useRef<string | null>(null);
  const inflightRef = useRef<Promise<WatchHubSourceResult[]> | null>(null);

  const loadSources = useCallback(async () => {
    const lookupId = watchHubLookupId(routeId, detail);
    if (!lookupId.trim()) {
      setError('Не удалось определить ID контента');
      return [];
    }
    if (inflightRef.current) return inflightRef.current;

    const run = async (): Promise<WatchHubSourceResult[]> => {
      setLoadingSources(true);
      setError(null);
      try {
        const title = lampaItemTitle(detail);
        const d = detail as unknown as Record<string, unknown>;
        let currentId = lookupId;
        let imdb = d.imdbId ?? d.imdb_id;
        let kp = d.kinopoiskId ?? d.kinopoisk_id;
        const tmdbForExt =
          d.tmdbId != null && Number(d.tmdbId) > 0
            ? String(d.tmdbId)
            : /^\d+$/.test(lookupId)
              ? lookupId
              : undefined;

        if (tmdbForExt || imdb || kp) {
          try {
            const ext = await fetchExternalIds({
              id: currentId,
              tmdbId: tmdbForExt,
              imdbId: typeof imdb === 'string' ? imdb : undefined,
              kinopoiskId: typeof kp === 'string' ? kp : undefined,
              serial: isSerial,
            });
            if (ext.tmdb_id?.trim()) currentId = ext.tmdb_id.trim();
            if (ext.imdb_id) imdb = ext.imdb_id;
            if (ext.kinopoisk_id) kp = ext.kinopoisk_id;
          } catch {
            /* optional */
          }
        }

        const req = buildTaskRequest({
          id: currentId,
          imdbId: typeof imdb === 'string' ? imdb : undefined,
          kinopoiskId: typeof kp === 'string' ? kp : undefined,
          title,
          originalTitle: String(d.originalTitle ?? d.original_title ?? title),
          isSerial,
          year: releaseYear(detail),
        });

        const task = await createTaskUntilReady(req, (response) => {
          taskIdRef.current = response.id;
          const ready = filterReadyWatchHubSources(response.results, response.ready_sources);
          if (ready.length) setSources(ready);
        });

        taskIdRef.current = task.id;
        const ready = filterReadyWatchHubSources(task.results, task.ready_sources);
        setSources(ready);
        return ready;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка WatchHub');
        return [];
      } finally {
        setLoadingSources(false);
        inflightRef.current = null;
      }
    };

    inflightRef.current = run();
    return inflightRef.current;
  }, [detail, isSerial, routeId]);

  const loadTranslators = useCallback(async (sourceId: string): Promise<WatchHubTranslator[]> => {
    const taskId = taskIdRef.current;
    if (!taskId) throw new Error('Задача WatchHub ещё не создана');
    return fetchTranslators(taskId, sourceId);
  }, []);

  const loadEpisodes = useCallback(
    async (sourceId: string, translatorId: number): Promise<WatchHubSeasonEpisodes[]> => {
      const taskId = taskIdRef.current;
      if (!taskId) throw new Error('Задача WatchHub ещё не создана');
      return fetchWatchHubEpisodes({ taskId, sourceId, translatorId });
    },
    [],
  );

  const resolveVideoLinks = useCallback(
    async (
      sourceId: string,
      translatorId: number,
      season?: number,
      episode?: number,
    ): Promise<WatchHubVideoLink[]> => {
      const taskId = taskIdRef.current;
      if (!taskId) return [];
      return fetchVideoLinks({ taskId, sourceId, translatorId, season, episode });
    },
    [],
  );

  const resolveStreamUrl = useCallback(
    async (
      sourceId: string,
      translatorId: number,
      season?: number,
      episode?: number,
      quality?: string,
    ) => {
      const links = await resolveVideoLinks(sourceId, translatorId, season, episode);
      return pickStreamUrlFromLinks(links, quality);
    },
    [resolveVideoLinks],
  );

  return {
    sources,
    loadingSources,
    error,
    setError,
    loadSources,
    loadTranslators,
    loadEpisodes,
    resolveVideoLinks,
    resolveStreamUrl,
  };
}
