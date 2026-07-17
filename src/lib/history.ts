import AsyncStorage from '@react-native-async-storage/async-storage';

import { resolvePosterUrl } from '@/lib/config';
import { lampaDetailPath } from '@/lib/lampaDetail';
import { extractPosterPath } from '@/lib/poster';
import type { SavedAnimeItem } from '@/types/progress';

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
}

const HIDDEN_KEY = 'aniverse.history.hidden.v1';

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

function resolveKind(raw: string): WatchHistoryItem['kind'] {
  const value = raw.toLowerCase();
  if (value.includes('anime')) return 'anime';
  if (value.includes('movie') || value.includes('film')) return 'movie';
  if (value.includes('tv') || value.includes('serial') || value.includes('series')) return 'tv';
  if (value.includes('manga')) return 'unknown';
  return 'unknown';
}

function normalizeFeedEntry(raw: unknown): WatchHistoryItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const snapshot =
    row.snapshot && typeof row.snapshot === 'object'
      ? (row.snapshot as Record<string, unknown>)
      : {};

  const entityType = String(
    row.entityType ?? row.kind ?? row.type ?? snapshot.kind ?? snapshot.entityType ?? '',
  ).trim();
  const kind = resolveKind(entityType);
  if (kind === 'unknown') return null;

  const title = String(
    row.title ?? snapshot.title ?? row.name ?? snapshot.name ?? '',
  ).trim();
  if (!title) return null;

  const animeId = Number(row.animeId ?? snapshot.animeId ?? snapshot.anime_id);
  const lampaId = String(
    row.lampaId ?? row.lampaObjectId ?? snapshot.lampaId ?? snapshot.objectId ?? '',
  ).trim();

  let href = '';
  if (kind === 'anime' && Number.isFinite(animeId) && animeId > 0) {
    href = `/anime/${animeId}`;
  } else if ((kind === 'movie' || kind === 'tv') && lampaId) {
    href = lampaDetailPath(kind, { id: lampaId });
  } else if (Number.isFinite(animeId) && animeId > 0) {
    href = `/anime/${animeId}`;
    return {
      id: String(row.id ?? `anime-${animeId}`),
      title,
      poster: resolvePosterUrl(extractPosterPath(row.poster ?? snapshot.poster)),
      kind: 'anime',
      href,
      openedAt: parseDate(row.createdAt ?? row.openedAt ?? row.updatedAt),
    };
  } else {
    return null;
  }

  const progress = Number(row.progress ?? snapshot.progress);
  return {
    id: String(row.id ?? `${kind}-${animeId || lampaId}`),
    title,
    poster: resolvePosterUrl(extractPosterPath(row.poster ?? snapshot.poster)),
    kind,
    href,
    openedAt: parseDate(row.createdAt ?? row.openedAt ?? row.updatedAt),
    progressPercent:
      Number.isFinite(progress) && progress > 0 && progress <= 1
        ? Math.round(progress * 100)
        : undefined,
  };
}

export function buildWatchHistoryItems(feedRows: unknown[]): WatchHistoryItem[] {
  const seen = new Set<string>();
  const items: WatchHistoryItem[] = [];
  for (const raw of feedRows) {
    const item = normalizeFeedEntry(raw);
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(item);
  }
  return items.sort(
    (a, b) => (b.openedAt?.getTime() ?? 0) - (a.openedAt?.getTime() ?? 0),
  );
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
): WatchHistoryItem[] {
  const posterByAnimeId = new Map<number, string>();
  for (const saved of savedAnime) {
    const id = saved.animeId ?? saved.id;
    if (!id) continue;
    const poster = saved.poster ?? extractPosterPath(saved.anime?.poster);
    if (poster) posterByAnimeId.set(id, resolvePosterUrl(poster) ?? poster);
  }
  return items.map((item) => {
    if (item.poster || item.kind !== 'anime') return item;
    const match = item.href.match(/^\/anime\/(\d+)/);
    if (!match) return item;
    const poster = posterByAnimeId.get(Number(match[1]));
    return poster ? { ...item, poster } : item;
  });
}
