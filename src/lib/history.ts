import AsyncStorage from '@react-native-async-storage/async-storage';

import { resolveAnimePosterUrl, resolveLampaPosterUrl, resolvePosterUrl } from '@/lib/config';
import { lampaDetailPath, lampaDetailRouteId, lampaTitle } from '@/lib/lampaDetail';
import { extractPosterPath } from '@/lib/poster';
import {
  groupAnimeProgressByAnimeId,
  groupLampaProgressById,
  IN_PROGRESS_MIN,
  normalizeProgress,
} from '@/lib/progressUtils';
import type { SavedAnimeItem, UserAnimeProgress, UserLampaProgress } from '@/types/progress';

export type HistoryMediaFilter = 'all' | 'anime' | 'movie' | 'tv';
export type HistoryDateGroupKey = 'today' | 'yesterday' | 'week' | 'earlier';

export interface WatchHistoryItem {
  id: string;
  title: string;
  poster?: string;
  kind: HistoryMediaFilter | 'unknown';
  href: string;
  openedAt: Date | null;
  progressPercent?: number;
  animeId?: number;
  lampaObjectId?: string;
}

const HIDDEN_KEY = 'aniverse.history.hidden.v1';
const COMPLETED_PROGRESS_THRESHOLD = 0.9;

const DATE_GROUP_LABELS: Record<HistoryDateGroupKey, string> = {
  today: 'Сегодня',
  yesterday: 'Вчера',
  week: 'На этой неделе',
  earlier: 'Ранее',
};

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function classifyDateGroup(date: Date | null): HistoryDateGroupKey {
  if (!date) return 'earlier';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  const time = date.getTime();
  if (time >= startOfToday.getTime()) return 'today';
  if (time >= startOfYesterday.getTime()) return 'yesterday';
  if (time >= startOfWeek.getTime()) return 'week';
  return 'earlier';
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return undefined;
}

function pickNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function parseSnapshot(snapshot: unknown): Record<string, unknown> {
  if (snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)) {
    return snapshot as Record<string, unknown>;
  }
  if (typeof snapshot === 'string' && snapshot.trim()) {
    try {
      const parsed = JSON.parse(snapshot) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }
  return {};
}

function resolveHistoryKind(
  entityType: string,
  snapshot: Record<string, unknown>,
): WatchHistoryItem['kind'] {
  const snapKind = String(snapshot.kind ?? snapshot.mediaKind ?? '').toLowerCase();
  if (entityType === 'anime' || entityType.includes('anime')) return 'anime';
  if (entityType.includes('manga')) return 'unknown';
  if (entityType === 'movie' || entityType.includes('film') || snapKind === 'movie') {
    return 'movie';
  }
  if (
    entityType === 'tv' ||
    entityType === 'series' ||
    entityType.includes('serial') ||
    entityType.includes('series') ||
    snapKind === 'tv'
  ) {
    return 'tv';
  }
  if (entityType === 'lampa' || entityType.includes('lampa')) {
    if (snapKind === 'tv') return 'tv';
    return 'movie';
  }
  if (snapKind === 'anime') return 'anime';
  return 'unknown';
}

function pickTitle(row: Record<string, unknown>, snapshot: Record<string, unknown>): string {
  return (pickString(row.title, row.name, snapshot.title, snapshot.name) ?? '').trim();
}

function pickPoster(
  row: Record<string, unknown>,
  snapshot: Record<string, unknown>,
  kind: WatchHistoryItem['kind'],
): string | undefined {
  const raw =
    pickString(
      row.poster,
      row.posterPath,
      row.poster_path,
      snapshot.poster,
      snapshot.posterPath,
      snapshot.poster_path,
      snapshot.cover,
    ) ?? extractPosterPath(snapshot.poster) ?? extractPosterPath(row.poster);

  if (!raw) return undefined;
  if (kind === 'movie' || kind === 'tv') {
    return resolveLampaPosterUrl(raw) ?? resolvePosterUrl(raw);
  }
  return resolveAnimePosterUrl(raw) ?? resolvePosterUrl(raw);
}

function pickAnimeId(
  row: Record<string, unknown>,
  snapshot: Record<string, unknown>,
  kind: WatchHistoryItem['kind'],
  entityType: string,
): number | undefined {
  if (kind !== 'anime' && entityType !== 'anime') return undefined;
  const raw = pickNumber(row.animeId, snapshot.animeId, snapshot.id, row.entityId, row.entity_id);
  if (raw == null || raw <= 0) return undefined;
  return Math.round(raw);
}

function pickLampaObjectId(
  row: Record<string, unknown>,
  snapshot: Record<string, unknown>,
  kind: WatchHistoryItem['kind'],
  entityType: string,
): string | undefined {
  if (kind !== 'movie' && kind !== 'tv' && !entityType.includes('lampa')) return undefined;
  return pickString(
    row.objectId,
    row.lampaObjectId,
    row.lampaId,
    snapshot.objectId,
    snapshot.lampaId,
    entityType.includes('lampa') ? row.entityId : undefined,
    entityType.includes('lampa') ? row.entity_id : undefined,
  );
}

function pickProgressPercent(
  row: Record<string, unknown>,
  snapshot: Record<string, unknown>,
): number | undefined {
  const raw = pickNumber(
    row.progress,
    row.progressPercent,
    row.watchProgress,
    snapshot.progress,
    snapshot.progressPercent,
    snapshot.watchProgress,
    snapshot.watchingProgress,
  );
  if (raw == null) return undefined;
  if (raw <= 1) return Math.round(Math.min(1, Math.max(0, raw)) * 100);
  return Math.round(Math.min(100, Math.max(0, raw)));
}

function buildHistoryHref(
  row: Record<string, unknown>,
  snapshot: Record<string, unknown>,
  kind: WatchHistoryItem['kind'],
  entityType: string,
): string {
  const animeId = pickNumber(row.animeId, snapshot.animeId, snapshot.id, row.entityId);
  if (kind === 'anime' || entityType.includes('anime')) {
    if (animeId != null && animeId > 0) return `/anime/${animeId}`;
  }

  const lampaItem = {
    id: snapshot.id as number | undefined,
    objectId: pickString(row.objectId, snapshot.objectId, row.entityId, row.entity_id),
    tmdbId: pickNumber(row.tmdbId, snapshot.tmdbId),
  };
  const path = lampaDetailPath(kind === 'tv' ? 'tv' : 'movie', lampaItem);
  if (path && !path.endsWith('/')) return path;

  const fallbackId = pickString(
    row.entityId,
    row.entity_id,
    row.objectId,
    row.lampaId,
    snapshot.objectId,
  );
  if (fallbackId && (kind === 'movie' || kind === 'tv')) {
    return kind === 'tv' ? `/series/${fallbackId}` : `/movies/${fallbackId}`;
  }

  return '';
}

function normalizeFeedEntry(raw: unknown): WatchHistoryItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (row.hiddenByActor === true) return null;

  const snapshot = parseSnapshot(row.snapshot);
  const entityType = String(
    row.entityType ?? row.kind ?? row.type ?? snapshot.kind ?? snapshot.entityType ?? '',
  )
    .trim()
    .toLowerCase();

  const kind = resolveHistoryKind(entityType, snapshot);
  if (kind === 'unknown') return null;

  const title = pickTitle(row, snapshot);
  if (!title) return null;

  const href = buildHistoryHref(row, snapshot, kind, entityType);
  if (!href) return null;

  const animeId = pickAnimeId(row, snapshot, kind, entityType);
  const lampaObjectId = pickLampaObjectId(row, snapshot, kind, entityType);
  const id =
    pickString(row.id) ??
    (animeId != null ? `anime-${animeId}` : undefined) ??
    (lampaObjectId ? `${kind}-${lampaObjectId}` : undefined) ??
    `${kind}-${title}`;

  return {
    id,
    title,
    poster: pickPoster(row, snapshot, kind),
    kind,
    href,
    openedAt: parseDate(
      row.createdAt ?? row.updatedAt ?? row.openedAt ?? row.created_at ?? row.updated_at,
    ),
    progressPercent: pickProgressPercent(row, snapshot),
    animeId,
    lampaObjectId,
  };
}

/** Content key used to dedupe feed rows and progress rows for the same title. */
export function historyContentKey(item: WatchHistoryItem): string {
  if (item.animeId != null) return `anime:${item.animeId}`;
  if (item.lampaObjectId) return `lampa:${item.lampaObjectId}`;
  return `id:${item.id}`;
}

function buildSavedLampaLookup(savedLampa: unknown[]): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  for (const raw of savedLampa) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const nested = row.lampa as Record<string, unknown> | undefined;
    const objectId = String(nested?.objectId ?? row.lampaObjectId ?? '').trim();
    if (objectId) map.set(objectId, row);
    const numericId = nested?.id ?? row.id;
    if (numericId != null) map.set(String(numericId), row);
  }
  return map;
}

function pickLatestProgressRow<T extends { updatedAt?: string; progress: number }>(rows: T[]): T {
  return rows.reduce((best, row) => {
    const bestTime = parseDate(best.updatedAt)?.getTime() ?? 0;
    const rowTime = parseDate(row.updatedAt)?.getTime() ?? 0;
    if (rowTime !== bestTime) return rowTime > bestTime ? row : best;
    return row.progress >= best.progress ? row : best;
  });
}

function buildAnimeHistoryFromProgress(
  animeId: number,
  rows: UserAnimeProgress[],
  saved?: SavedAnimeItem,
): WatchHistoryItem | null {
  const watchedRows = rows.filter((row) => row.progress > IN_PROGRESS_MIN);
  if (!watchedRows.length) return null;

  const latest = pickLatestProgressRow(watchedRows);
  const progress = normalizeProgress(latest.progress);
  const watched = !!latest.completed || progress >= COMPLETED_PROGRESS_THRESHOLD;
  const progressPercent = Math.round(progress * 100);
  const detail = saved?.anime;
  const title =
    (typeof detail?.title === 'string' && detail.title.trim()) ||
    saved?.title ||
    `Аниме ${animeId}`;
  const posterRaw = detail ? extractPosterPath(detail.poster) : saved?.poster;
  const poster = posterRaw
    ? resolveAnimePosterUrl(posterRaw) ?? resolvePosterUrl(posterRaw)
    : undefined;

  return {
    id: `progress-anime-${animeId}`,
    title,
    poster,
    kind: 'anime',
    href: `/anime/${animeId}`,
    openedAt: parseDate(latest.updatedAt) ?? new Date(),
    progressPercent: watched ? 100 : progressPercent,
    animeId,
  };
}

function buildLampaHistoryFromProgress(
  lampaId: string,
  rows: UserLampaProgress[],
  saved?: Record<string, unknown>,
): WatchHistoryItem | null {
  const watchedRows = rows.filter((row) => row.progress > IN_PROGRESS_MIN);
  if (!watchedRows.length) return null;

  const latest = pickLatestProgressRow(watchedRows);
  const progress = normalizeProgress(latest.progress);
  const watched = !!latest.completed || progress >= COMPLETED_PROGRESS_THRESHOLD;
  const progressPercent = Math.round(progress * 100);
  const nested = saved?.lampa as Record<string, unknown> | undefined;
  const kind =
    String(nested?.kind ?? saved?.kind ?? saved?.mediaKind ?? 'movie') === 'tv' ? 'tv' : 'movie';

  const routeItem = nested ?? {
    id: /^\d+$/.test(lampaId) ? Number(lampaId) : undefined,
    tmdbId: /^\d+$/.test(lampaId) ? Number(lampaId) : undefined,
    objectId: lampaId,
  };
  const routeId = lampaDetailRouteId(routeItem);
  const href = routeId
    ? lampaDetailPath(kind, routeItem)
    : kind === 'tv'
      ? `/series/${lampaId}`
      : `/movies/${lampaId}`;

  const title = nested
    ? lampaTitle(nested)
    : String(saved?.title ?? saved?.name ?? 'Без названия');
  const posterRaw = String(
    nested?.poster ??
      nested?.posterPath ??
      nested?.poster_path ??
      saved?.poster ??
      saved?.posterPath ??
      saved?.poster_path ??
      '',
  );
  const poster = resolveLampaPosterUrl(posterRaw) ?? resolvePosterUrl(posterRaw);

  return {
    id: `progress-lampa-${kind}-${lampaId}`,
    title,
    poster: poster || undefined,
    kind,
    href,
    openedAt: parseDate(latest.updatedAt) ?? new Date(),
    progressPercent: watched ? 100 : progressPercent,
    lampaObjectId: lampaId,
  };
}

export function buildProgressHistoryItems(
  savedAnime: SavedAnimeItem[],
  savedLampa: unknown[],
  animeProgress: UserAnimeProgress[] = [],
  lampaProgress: UserLampaProgress[] = [],
): WatchHistoryItem[] {
  const items: WatchHistoryItem[] = [];
  const savedAnimeById = new Map<number, SavedAnimeItem>();
  for (const saved of savedAnime) {
    const animeId = saved.animeId ?? saved.id;
    if (animeId != null) savedAnimeById.set(animeId, saved);
  }

  for (const [animeId, rows] of groupAnimeProgressByAnimeId(animeProgress)) {
    const entry = buildAnimeHistoryFromProgress(animeId, rows, savedAnimeById.get(animeId));
    if (entry) items.push(entry);
  }

  const savedLampaById = buildSavedLampaLookup(savedLampa);
  for (const [lampaId, rows] of groupLampaProgressById(lampaProgress)) {
    const entry = buildLampaHistoryFromProgress(lampaId, rows, savedLampaById.get(lampaId));
    if (entry) items.push(entry);
  }

  return items;
}

export function mergeHistoryItems(
  feedItems: WatchHistoryItem[],
  progressItems: WatchHistoryItem[],
): WatchHistoryItem[] {
  const merged = new Map<string, WatchHistoryItem>();

  for (const item of feedItems) {
    merged.set(historyContentKey(item), item);
  }

  for (const item of progressItems) {
    const key = historyContentKey(item);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, item);
      continue;
    }

    const existingTime = existing.openedAt?.getTime() ?? 0;
    const itemTime = item.openedAt?.getTime() ?? 0;
    if (itemTime >= existingTime) {
      merged.set(key, {
        ...item,
        id: existing.id.startsWith('progress-') ? item.id : existing.id,
        title: item.title || existing.title,
        poster: item.poster ?? existing.poster,
        progressPercent: item.progressPercent ?? existing.progressPercent,
        href: item.href || existing.href,
      });
      continue;
    }

    merged.set(key, {
      ...existing,
      title: existing.title || item.title,
      poster: existing.poster ?? item.poster,
      progressPercent: existing.progressPercent ?? item.progressPercent,
    });
  }

  return [...merged.values()].sort(
    (a, b) => (b.openedAt?.getTime() ?? 0) - (a.openedAt?.getTime() ?? 0),
  );
}

export function buildWatchHistoryItems(
  feedRows: unknown[],
  savedAnime: SavedAnimeItem[] = [],
  savedLampa: unknown[] = [],
  animeProgress: UserAnimeProgress[] = [],
  lampaProgress: UserLampaProgress[] = [],
): WatchHistoryItem[] {
  const feedItems = feedRows
    .map(normalizeFeedEntry)
    .filter((item): item is WatchHistoryItem => item != null);
  const progressItems = buildProgressHistoryItems(
    savedAnime,
    savedLampa,
    animeProgress,
    lampaProgress,
  );
  return mergeHistoryItems(feedItems, progressItems);
}

export function filterHistoryByMedia(
  items: WatchHistoryItem[],
  media: HistoryMediaFilter,
): WatchHistoryItem[] {
  if (media === 'all') return items;
  return items.filter((item) => item.kind === media);
}

export function groupHistoryByDate(items: WatchHistoryItem[]) {
  const buckets: Record<HistoryDateGroupKey, WatchHistoryItem[]> = {
    today: [],
    yesterday: [],
    week: [],
    earlier: [],
  };
  for (const item of items) {
    buckets[classifyDateGroup(item.openedAt)].push(item);
  }
  return (Object.keys(DATE_GROUP_LABELS) as HistoryDateGroupKey[])
    .filter((key) => buckets[key].length > 0)
    .map((key) => ({ key, label: DATE_GROUP_LABELS[key], items: buckets[key] }));
}

export async function getHiddenHistoryIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(HIDDEN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === 'string'));
  } catch {
    return new Set();
  }
}

export async function hideHistoryIds(ids: string[]): Promise<void> {
  const hidden = await getHiddenHistoryIds();
  for (const id of ids) hidden.add(id);
  await AsyncStorage.setItem(HIDDEN_KEY, JSON.stringify([...hidden]));
}

export function enrichHistoryPosters(
  items: WatchHistoryItem[],
  savedAnime: SavedAnimeItem[],
  savedLampa: unknown[] = [],
): WatchHistoryItem[] {
  const posterByAnimeId = new Map<number, string>();
  for (const saved of savedAnime) {
    const id = saved.animeId ?? saved.id;
    if (!id) continue;
    const poster = saved.poster ?? extractPosterPath(saved.anime?.poster);
    if (poster) {
      posterByAnimeId.set(id, resolveAnimePosterUrl(poster) ?? resolvePosterUrl(poster) ?? poster);
    }
  }

  const posterByLampaId = new Map<string, string>();
  for (const raw of savedLampa) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const nested = row.lampa as Record<string, unknown> | undefined;
    const objectId = String(nested?.objectId ?? row.lampaObjectId ?? '').trim();
    if (!objectId) continue;
    const posterRaw = String(
      nested?.poster ?? nested?.posterPath ?? nested?.poster_path ?? row.poster ?? '',
    );
    const poster = resolveLampaPosterUrl(posterRaw) ?? resolvePosterUrl(posterRaw);
    if (poster) posterByLampaId.set(objectId, poster);
  }

  return items.map((item) => {
    if (item.poster) return item;
    if (item.kind === 'anime' && item.animeId != null) {
      const poster = posterByAnimeId.get(item.animeId);
      if (poster) return { ...item, poster };
    }
    if ((item.kind === 'movie' || item.kind === 'tv') && item.lampaObjectId) {
      const poster = posterByLampaId.get(item.lampaObjectId);
      if (poster) return { ...item, poster };
    }
    if (item.kind === 'anime') {
      const match = item.href.match(/^\/anime\/(\d+)/);
      if (!match) return item;
      const poster = posterByAnimeId.get(Number(match[1]));
      return poster ? { ...item, poster } : item;
    }
    return item;
  });
}
