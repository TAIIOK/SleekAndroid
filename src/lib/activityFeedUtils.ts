import { resolveAnimePosterUrl, resolveLampaPosterUrl } from '@/lib/config';
import type { HistoryDateGroupKey } from '@/lib/history';
import { lampaDetailPath } from '@/lib/lampaDetail';
import type { ActivityFeedDisplayItem, ActivityFeedItem } from '@/types/activityFeed';

const DATE_GROUP_LABELS: Record<HistoryDateGroupKey, string> = {
  today: 'Сегодня',
  yesterday: 'Вчера',
  week: 'На этой неделе',
  earlier: 'Ранее',
};

const ACTION_LABELS: Record<string, string> = {
  watch: 'смотрит',
  view: 'смотрит',
  view_progress: 'смотрит',
  view_complete: 'досмотрел',
  complete: 'досмотрел',
  rate: 'оценил',
  review: 'написал отзыв',
  bookmark: 'добавил в закладки',
  favorite: 'добавил в избранное',
  listen: 'слушает',
  read: 'читает',
  play: 'смотрит',
  unlock: 'получил достижение',
};

function parseSnapshot(snapshot: unknown): Record<string, unknown> {
  if (!snapshot) return {};
  if (typeof snapshot === 'string') {
    try {
      const parsed = JSON.parse(snapshot) as unknown;
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return typeof snapshot === 'object' ? (snapshot as Record<string, unknown>) : {};
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function pickTitle(item: ActivityFeedItem, snapshot: Record<string, unknown>): string {
  return (
    pickString(
      item.text,
      snapshot.title,
      snapshot.name,
      snapshot.animeTitle,
      snapshot.mediaTitle,
    ) || 'Без названия'
  );
}

function resolveMediaKind(
  entityType: string,
  snapshot: Record<string, unknown>,
): 'anime' | 'movie' | 'tv' | 'other' {
  if (entityType.includes('anime')) return 'anime';
  if (entityType.includes('tv') || entityType.includes('serial')) return 'tv';
  if (entityType.includes('movie') || entityType.includes('lampa')) {
    const kind = String(snapshot.kind ?? snapshot.mediaKind ?? '').toLowerCase();
    if (kind === 'tv' || kind === 'home') return 'tv';
    return 'movie';
  }
  return 'other';
}

function pickPoster(
  snapshot: Record<string, unknown>,
  kind: 'anime' | 'movie' | 'tv' | 'other',
): string | undefined {
  const raw = pickString(
    snapshot.poster,
    snapshot.posterPath,
    snapshot.poster_path,
    snapshot.image,
  );
  if (!raw) return undefined;
  if (kind === 'anime') return resolveAnimePosterUrl(raw);
  return resolveLampaPosterUrl(raw) ?? resolveAnimePosterUrl(raw);
}

function buildActivityLink(
  item: ActivityFeedItem,
  snapshot: Record<string, unknown>,
  kind: 'anime' | 'movie' | 'tv' | 'other',
  entityType: string,
): string {
  if (kind === 'anime') {
    const animeId = pickString(item.entityId, snapshot.animeId, snapshot.id);
    return animeId ? `/anime/${animeId}` : '/';
  }
  if (kind === 'movie' || kind === 'tv') {
    const path = lampaDetailPath(kind, {
      id: pickString(item.entityId, snapshot.tmdbId, snapshot.id),
      tmdbId: pickString(snapshot.tmdbId, snapshot.id),
      objectId: pickString(snapshot.objectId),
    });
    if (path) return path;
  }
  if (entityType.includes('user') || entityType.includes('friend')) {
    return `/users/${encodeURIComponent(item.actorUserId)}`;
  }
  return '/';
}

export function formatActivityAction(action: string): string {
  const key = action.trim().toLowerCase();
  if (ACTION_LABELS[key]) return ACTION_LABELS[key];
  if (key.includes('complete') || key.includes('finish')) return 'досмотрел';
  if (key.includes('watch') || key.includes('view')) return 'смотрит';
  if (key.includes('rate')) return 'оценил';
  if (key.includes('review')) return 'написал отзыв';
  if (key.includes('bookmark') || key.includes('favorite')) return 'добавил в избранное';
  return 'активность';
}

export function toActivityDisplayItem(item: ActivityFeedItem): ActivityFeedDisplayItem | null {
  if (item.hiddenByActor) return null;

  const snapshot = parseSnapshot(item.snapshot);
  const entityType = String(item.entityType ?? '').trim().toLowerCase();
  const kind = resolveMediaKind(entityType, snapshot);
  const actor = item.actor ?? { id: item.actorUserId, nickname: undefined, avatar: undefined };

  return {
    id: item.id,
    actor,
    actionLabel: formatActivityAction(item.action),
    title: pickTitle(item, snapshot),
    poster: pickPoster(snapshot, kind),
    to: buildActivityLink(item, snapshot, kind, entityType),
    createdAt: parseDate(item.createdAt),
  };
}

export function groupFeedByDate(
  items: ActivityFeedDisplayItem[],
): Array<{ key: HistoryDateGroupKey; label: string; items: ActivityFeedDisplayItem[] }> {
  const buckets: Record<HistoryDateGroupKey, ActivityFeedDisplayItem[]> = {
    today: [],
    yesterday: [],
    week: [],
    earlier: [],
  };

  for (const item of items) {
    buckets[classifyDateGroup(item.createdAt)].push(item);
  }

  return (Object.keys(DATE_GROUP_LABELS) as HistoryDateGroupKey[])
    .filter((key) => buckets[key].length > 0)
    .map((key) => ({
      key,
      label: DATE_GROUP_LABELS[key],
      items: buckets[key],
    }));
}

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
  startOfWeek.setDate(startOfWeek.getDate() - 6);

  if (date >= startOfToday) return 'today';
  if (date >= startOfYesterday) return 'yesterday';
  if (date >= startOfWeek) return 'week';
  return 'earlier';
}
