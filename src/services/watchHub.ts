import { watchHubUrl } from '@/lib/config';

export interface WatchHubTaskRequest {
  id: string;
  imdb_id?: string | null;
  kinopoisk_id?: string | null;
  title: string;
  original_title: string;
  serial: boolean;
  anime?: boolean;
  original_language: string;
  year: number;
}

export interface WatchHubSourceResult {
  title: string;
  url: string;
  source_id: string;
  data?: { year?: number; country?: string; genre?: string };
}

export interface WatchHubTaskResponse {
  id: string;
  status: string;
  results?: WatchHubSourceResult[];
  ready_sources?: string[];
}

export interface WatchHubTranslator {
  id: number;
  name?: string;
}

export interface WatchHubEpisodeItem {
  season: number;
  episode: number;
  title: string;
  externalId?: string;
}

export interface WatchHubSeasonEpisodes {
  seasonNumber: number;
  episodes: WatchHubEpisodeItem[];
}

export interface WatchHubSubtitleInfo {
  label: string;
  url: string;
}

export interface WatchHubVideoLink {
  quality: string;
  urls?: string[];
  stream?: string[];
  file?: string[];
  proxy?: { stream?: string[]; file?: string[] };
  /** Sidecar WebVTT tracks (`docs/sidecar_subtitles.md`). Use URL as-is. */
  subtitles?: WatchHubSubtitleInfo[];
}

const TASK_PATH = '/api/task';
const POLL_MS = 5000;
const MAX_POLLS = 60;
/** Bound process-lifetime task cache (insertion-order Map = LRU-ish). */
const MAX_TASK_RESPONSE_CACHE = 40;
const taskResponseCache = new Map<string, WatchHubTaskResponse>();

function taskContentKey(req: WatchHubTaskRequest): string {
  return `${req.id}|${req.serial ? 1 : 0}`;
}

function rememberTaskResponse(key: string, response: WatchHubTaskResponse): void {
  if (taskResponseCache.has(key)) taskResponseCache.delete(key);
  taskResponseCache.set(key, response);
  while (taskResponseCache.size > MAX_TASK_RESPONSE_CACHE) {
    const oldest = taskResponseCache.keys().next().value;
    if (oldest == null) break;
    taskResponseCache.delete(oldest);
  }
}

export function toSleekTaskRequest(req: WatchHubTaskRequest): WatchHubTaskRequest {
  return {
    id: req.id.trim(),
    imdb_id: req.imdb_id?.trim() || undefined,
    kinopoisk_id: req.kinopoisk_id?.trim() || undefined,
    title: req.title,
    original_title: req.original_title,
    serial: req.serial,
    anime: req.anime ?? false,
    original_language: req.original_language || 'ru',
    year: req.year,
  };
}

function is409Error(message: string): boolean {
  return message.includes('409') || message.includes('task already exists');
}

async function whFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(watchHubUrl(path), {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let detail = '';
    try {
      const errJson = (await res.json()) as { error?: string; status?: string };
      if (errJson.error) detail = `: ${errJson.error}`;
      else if (errJson.status) detail = `: ${errJson.status}`;
    } catch {
      /* ignore */
    }
    throw new Error(`WatchHub ${res.status}${detail}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function fetchExternalIds(params: {
  id: string;
  tmdbId?: string;
  imdbId?: string;
  kinopoiskId?: string;
  serial: boolean;
}): Promise<{ imdb_id?: string; kinopoisk_id?: string; tmdb_id?: string }> {
  const hasAny = [params.tmdbId, params.imdbId, params.kinopoiskId].some((v) => !!v?.trim());
  if (!hasAny) return {};
  const qs = new URLSearchParams({ id: params.id, serial: params.serial ? '1' : '0' });
  if (params.tmdbId) qs.set('tmdb_id', params.tmdbId);
  if (params.imdbId) qs.set('imdb_id', params.imdbId);
  if (params.kinopoiskId) qs.set('kinopoisk_id', params.kinopoiskId);
  return whFetch(`/api/externalids?${qs}`);
}

export async function postTask(req: WatchHubTaskRequest): Promise<WatchHubTaskResponse> {
  const key = taskContentKey(req);
  const sleek = toSleekTaskRequest(req);
  try {
    const response = await whFetch<WatchHubTaskResponse>(TASK_PATH, {
      method: 'POST',
      body: JSON.stringify(sleek),
    });
    if (response?.id) rememberTaskResponse(key, response);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (is409Error(message)) {
      const cached = taskResponseCache.get(key);
      if (cached?.id) return cached;
    }
    throw error;
  }
}

export async function createTaskUntilReady(
  req: WatchHubTaskRequest,
  onUpdate?: (r: WatchHubTaskResponse) => void,
): Promise<WatchHubTaskResponse> {
  const key = taskContentKey(req);
  const cached = taskResponseCache.get(key);
  let lastGood: WatchHubTaskResponse | null = cached?.id ? cached : null;

  const pollOnce = async () => {
    try {
      const response = await postTask(req);
      lastGood = response;
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (is409Error(message) && lastGood) return lastGood;
      throw error;
    }
  };

  let response = await pollOnce();
  onUpdate?.(response);
  if (response.status !== 'running' && response.status !== 'pending') return response;

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    response = await pollOnce();
    onUpdate?.(response);
    if (response.status !== 'running' && response.status !== 'pending') return response;
  }

  if (lastGood && filterReadyWatchHubSources(lastGood.results, lastGood.ready_sources).length) {
    return lastGood;
  }
  throw new Error('Превышено время ожидания WatchHub');
}

export async function fetchTranslators(
  taskId: string,
  sourceId: string,
): Promise<WatchHubTranslator[]> {
  const json = await whFetch<{ translators?: WatchHubTranslator[] }>(
    `/api/task/${taskId}/translators`,
    { method: 'POST', body: JSON.stringify({ source_id: sourceId }) },
  );
  return json?.translators ?? [];
}

export async function fetchWatchHubEpisodes(params: {
  taskId: string;
  sourceId: string;
  translatorId: number;
}): Promise<WatchHubSeasonEpisodes[]> {
  const json = await whFetch<{
    seasons?: Record<string, Array<{ season?: number; episode: number; title?: string }>>;
  }>(`/api/task/${params.taskId}/episodes`, {
    method: 'POST',
    body: JSON.stringify({
      source_id: params.sourceId,
      translator_id: params.translatorId,
    }),
  });

  const seasons = json?.seasons ?? {};
  return Object.entries(seasons)
    .map(([key, episodes]) => {
      const seasonNumber = parseInt(key, 10);
      const num = Number.isFinite(seasonNumber) ? seasonNumber : 1;
      return {
        seasonNumber: num,
        episodes: (episodes ?? [])
          .map((ep) => ({
            season: ep.season ?? num,
            episode: ep.episode,
            title: ep.title?.trim() || `Эпизод ${ep.episode}`,
          }))
          .sort((a, b) => a.episode - b.episode),
      };
    })
    .sort((a, b) => a.seasonNumber - b.seasonNumber);
}

export async function fetchVideoLinks(params: {
  taskId: string;
  sourceId: string;
  translatorId: number;
  season?: number;
  episode?: number;
}): Promise<WatchHubVideoLink[]> {
  const body: Record<string, unknown> = {
    source_id: params.sourceId,
    translator_id: params.translatorId,
  };
  if (params.season != null) body.season = params.season;
  if (params.episode != null) body.episode = params.episode;

  const json = await whFetch<{
    links?: WatchHubVideoLink[];
    data?: { links?: WatchHubVideoLink[] };
  }>(`/api/task/${params.taskId}/links`, { method: 'POST', body: JSON.stringify(body) });

  return json?.links ?? json?.data?.links ?? [];
}

function firstUrl(candidates: (string | undefined)[]): string | undefined {
  return candidates.find((u) => typeof u === 'string' && u.trim().length > 0);
}

export function pickStreamUrl(link: WatchHubVideoLink): string | undefined {
  return firstUrl([
    ...(link.stream ?? []),
    ...(link.file ?? []),
    ...(link.urls ?? []),
    ...(link.proxy?.stream ?? []),
    ...(link.proxy?.file ?? []),
  ]);
}

export function formatWatchHubQualityLabel(quality: string | undefined): string {
  const raw = quality?.trim();
  if (!raw) return 'Авто';
  const digits = raw.toLowerCase().match(/(\d{3,4})/)?.[1];
  if (digits) return `${digits}p`;
  return raw;
}

export function listWatchHubQualityOptions(links: WatchHubVideoLink[]) {
  const options: { quality: string; url: string }[] = [];
  const seen = new Set<string>();
  for (const link of links) {
    const quality = formatWatchHubQualityLabel(link.quality);
    if (seen.has(quality)) continue;
    const url = pickStreamUrl(link);
    if (!url) continue;
    seen.add(quality);
    options.push({ quality, url });
  }
  return options;
}

export function pickStreamUrlFromLinks(
  links: WatchHubVideoLink[],
  quality?: string,
): string | undefined {
  const options = listWatchHubQualityOptions(links);
  if (!options.length) return undefined;
  if (!quality) return options[0]?.url;
  return options.find((o) => o.quality === quality)?.url ?? options[0]?.url;
}

export function filterReadyWatchHubSources(
  results: WatchHubSourceResult[] | undefined,
  readySources?: string[],
): WatchHubSourceResult[] {
  if (!results?.length) return [];
  if (!readySources?.length) return results;
  const ready = new Set(readySources);
  return results.filter((source) => ready.has(source.source_id));
}

export function watchHubSourceLabel(source: WatchHubSourceResult): string {
  return source.source_id?.trim() || source.title?.trim() || 'Источник';
}

export function buildTaskRequest(item: {
  id: string;
  imdbId?: string;
  kinopoiskId?: string;
  title: string;
  originalTitle?: string;
  isSerial: boolean;
  year?: number | string;
}): WatchHubTaskRequest {
  const year =
    typeof item.year === 'number'
      ? item.year
      : parseInt(String(item.year ?? '0'), 10) || 0;
  return {
    id: item.id.trim(),
    imdb_id: item.imdbId?.trim() || undefined,
    kinopoisk_id: item.kinopoiskId?.trim() || undefined,
    title: item.title,
    original_title: item.originalTitle ?? item.title,
    serial: item.isSerial,
    anime: false,
    original_language: 'ru',
    year,
  };
}
