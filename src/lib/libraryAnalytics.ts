import {
  getLampaKind,
  getSavedLampaUserStatus,
  hasListStatus,
  hasLampaListStatus,
  MY_LISTS_STATUS_ORDER,
  normalizeListStatus,
  type MyListsMediaFilter,
  type UserAnimeStatus,
} from '@/lib/myLists';
import type { UserStats } from '@/api/user';
import type { SavedAnimeItem } from '@/types/progress';

export type LibraryMediaKindCount = {
  anime: number;
  movie: number;
  tv: number;
};

export type LibraryAnalytics = {
  total: number;
  byMedia: LibraryMediaKindCount;
  byStatus: Record<UserAnimeStatus, number>;
  completionRate: number;
  watchingShare: number;
  collections: number;
  favorites: number;
  watchSeconds: number;
  currentStreak: number;
  longestStreak: number;
};

function matchesMedia(kind: 'anime' | 'movie' | 'tv', media: MyListsMediaFilter): boolean {
  if (media === 'all') return true;
  return kind === media;
}

export function buildLibraryAnalytics(
  anime: SavedAnimeItem[],
  lampa: unknown[],
  media: MyListsMediaFilter,
  collectionsCount = 0,
  userStats?: UserStats | null,
): LibraryAnalytics {
  const byMedia: LibraryMediaKindCount = { anime: 0, movie: 0, tv: 0 };
  const byStatus = {
    watching: 0,
    planned: 0,
    on_hold: 0,
    completed: 0,
    dropped: 0,
  } as Record<UserAnimeStatus, number>;
  let favorites = 0;

  for (const item of anime) {
    if (!hasListStatus(item.status)) continue;
    if (!matchesMedia('anime', media)) continue;
    byMedia.anime += 1;
    const status = normalizeListStatus(item.status);
    if (status !== 'none') byStatus[status] += 1;
    if (item.isFavorite) favorites += 1;
  }

  for (const row of lampa) {
    const entry = row as Record<string, unknown>;
    if (!hasLampaListStatus(entry)) continue;
    const kind = getLampaKind(entry) === 'tv' ? 'tv' : 'movie';
    if (!matchesMedia(kind, media)) continue;
    byMedia[kind] += 1;
    const status = getSavedLampaUserStatus(entry);
    const normalized = normalizeListStatus(status);
    if (normalized !== 'none') byStatus[normalized] += 1;
    if (entry.isFavorite || entry.is_favorite) favorites += 1;
  }

  const total = byMedia.anime + byMedia.movie + byMedia.tv;
  const completed = byStatus.completed;
  const watching = byStatus.watching;

  return {
    total,
    byMedia,
    byStatus,
    completionRate: total > 0 ? completed / total : 0,
    watchingShare: total > 0 ? watching / total : 0,
    collections: collectionsCount,
    favorites,
    watchSeconds: userStats?.totalWatchSeconds ?? userStats?.activity?.totalWatchSeconds ?? 0,
    currentStreak: userStats?.history?.currentStreak ?? 0,
    longestStreak: userStats?.history?.longestStreak ?? 0,
  };
}

export function libraryStatusBarRows(byStatus: Record<UserAnimeStatus, number>) {
  const total = MY_LISTS_STATUS_ORDER.reduce((sum, status) => sum + (byStatus[status] ?? 0), 0);
  return MY_LISTS_STATUS_ORDER.map((status) => ({
    status,
    count: byStatus[status] ?? 0,
    ratio: total > 0 ? (byStatus[status] ?? 0) / total : 0,
  }));
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}
