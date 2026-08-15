import { fetchLampaDetail, type LampaDetail } from '@/api/catalog';
import { resolveLampaTmdbId } from '@/lib/lampaDetail';
import { loadLampaLastSelection } from '@/lib/lampaLastSelection';
import { setLampaWatchPayload } from '@/lib/watchStore';
import {
  buildTaskRequest,
  createTaskUntilReady,
  fetchExternalIds,
  fetchTranslators,
  fetchVideoLinks,
  fetchWatchHubEpisodes,
  filterReadyWatchHubSources,
  watchHubSourceLabel,
  type WatchHubSourceResult,
  type WatchHubTranslator,
} from '@/services/watchHub';

function detailTitle(detail: LampaDetail): string {
  for (const value of [detail.title, detail.name, detail.originalTitle, detail.original_title]) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return 'Воспроизведение';
}

export interface ResumeLampaPlaybackParams {
  kind: 'movie' | 'tv';
  routeId: string;
  season?: number;
  episode?: number;
  startProgress?: number;
  lampaObjectId?: string;
  /** Preloaded detail skips a second catalog fetch (detail screen). */
  detail?: LampaDetail;
}

function releaseYear(detail: LampaDetail): string {
  const d = detail as unknown as Record<string, unknown>;
  const raw = d.releaseDate ?? d.release_date ?? d.first_air_date;
  if (!raw) return '0';
  const year = parseInt(String(raw).slice(0, 4), 10);
  return Number.isFinite(year) ? String(year) : '0';
}

function matchSource(
  sources: WatchHubSourceResult[],
  sourceId: string,
): WatchHubSourceResult | undefined {
  const needle = sourceId.trim().toLowerCase();
  if (!needle) return undefined;
  return (
    sources.find((s) => watchHubSourceLabel(s).toLowerCase() === needle) ??
    sources.find((s) => s.source_id?.trim().toLowerCase() === needle) ??
    sources.find((s) => s.title?.trim().toLowerCase() === needle)
  );
}

function matchTranslator(
  translators: WatchHubTranslator[],
  dubId: string,
): WatchHubTranslator | undefined {
  const needle = dubId.trim().toLowerCase();
  if (!needle) return translators[0];
  return (
    translators.find((t) => (t.name ?? '').trim().toLowerCase() === needle) ?? translators[0]
  );
}

async function bootstrapWatchHub(
  detail: LampaDetail,
  kind: 'movie' | 'tv',
  routeId: string,
): Promise<{ taskId: string; sources: WatchHubSourceResult[] } | null> {
  const isSerial = kind === 'tv';
  const lookupId = routeId.trim() || (detail.id != null ? String(detail.id) : '');
  if (!lookupId) return null;

  const title = detailTitle(detail);
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

  const task = await createTaskUntilReady(
    buildTaskRequest({
      id: currentId,
      imdbId: typeof imdb === 'string' ? imdb : undefined,
      kinopoiskId: typeof kp === 'string' ? kp : undefined,
      title,
      originalTitle: String(d.originalTitle ?? d.original_title ?? title),
      isSerial,
      year: releaseYear(detail),
    }),
  );

  const sources = filterReadyWatchHubSources(task.results, task.ready_sources);
  if (!task.id || !sources.length) return null;
  return { taskId: task.id, sources };
}

/**
 * Like iOS continue-watching: restore last source/dub (or first ready) and
 * prepare the player payload. Returns true when playback can start immediately.
 */
export async function resumeLampaFromLastSelection(
  params: ResumeLampaPlaybackParams,
): Promise<boolean> {
  const routeId = params.routeId.trim();
  if (!routeId) return false;

  const selection =
    (await loadLampaLastSelection(routeId)) ??
    (params.lampaObjectId
      ? await loadLampaLastSelection(params.lampaObjectId)
      : null);

  try {
    const detail = params.detail ?? (await fetchLampaDetail(params.kind, routeId));
    const session = await bootstrapWatchHub(detail, params.kind, routeId);
    if (!session) return false;

    const source =
      (selection ? matchSource(session.sources, selection.sourceId) : undefined) ??
      session.sources[0];
    if (!source) return false;

    const translators = await fetchTranslators(session.taskId, source.source_id);
    const translator = matchTranslator(translators, selection?.dubId ?? '');
    if (!translator) return false;

    let season: number | undefined;
    let episode: number | undefined;
    let seasons: Awaited<ReturnType<typeof fetchWatchHubEpisodes>> | undefined;

    if (params.kind === 'tv') {
      seasons = await fetchWatchHubEpisodes({
        taskId: session.taskId,
        sourceId: source.source_id,
        translatorId: translator.id,
      });
      const targetSeason = params.season ?? selection?.seasonNumber;
      const targetEpisode = params.episode ?? 1;
      const seasonRow =
        seasons.find((s) => s.seasonNumber === targetSeason) ?? seasons[0];
      if (!seasonRow) return false;
      const ep =
        seasonRow.episodes.find((item) => item.episode === targetEpisode) ??
        seasonRow.episodes[0];
      if (!ep) return false;
      season = ep.season;
      episode = ep.episode;
    }

    const links = await fetchVideoLinks({
      taskId: session.taskId,
      sourceId: source.source_id,
      translatorId: translator.id,
      season,
      episode,
    });
    if (!links.length) return false;

    const title = detailTitle(detail);
    const startProgress = params.startProgress;
    const detailRecord = detail as unknown as Record<string, unknown>;
    const imdbRaw = detailRecord.imdbId ?? detailRecord.imdb_id;
    setLampaWatchPayload({
      lampaLinks: links,
      lampaId: /^\d+$/.test(routeId) ? routeId : (params.lampaObjectId ?? routeId),
      lampaKind: params.kind,
      lampaTitle: title,
      season,
      episode,
      tmdbId: resolveLampaTmdbId(detail, routeId),
      imdbId: typeof imdbRaw === 'string' && imdbRaw.trim() ? imdbRaw.trim() : undefined,
      startProgress:
        startProgress != null && startProgress > 0.01 && startProgress < 0.98
          ? startProgress
          : undefined,
      taskId: session.taskId,
      sourceId: source.source_id,
      translatorId: translator.id,
      seasons,
    });
    return true;
  } catch {
    return false;
  }
}
