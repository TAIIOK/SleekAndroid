import type { SavedAnimeItem } from '@/types/progress';

export type MyListsMediaFilter = 'all' | 'anime' | 'movie' | 'tv';
export type MyListsStatusFilter = 'all' | UserAnimeStatus;
export type UserAnimeStatus = 'watching' | 'planned' | 'completed' | 'dropped' | 'on_hold';

export const MY_LISTS_STATUS_LABELS: Record<UserAnimeStatus, string> = {
  watching: 'Смотрю',
  planned: 'В планах',
  completed: 'Просмотрено',
  dropped: 'Брошено',
  on_hold: 'Отложено',
};

export const MY_LISTS_STATUS_ORDER: UserAnimeStatus[] = [
  'watching',
  'planned',
  'on_hold',
  'completed',
  'dropped',
];

export const MY_LISTS_MEDIA_OPTIONS: { id: MyListsMediaFilter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'anime', label: 'Аниме' },
  { id: 'movie', label: 'Фильмы' },
  { id: 'tv', label: 'Сериалы' },
];

export const MY_LISTS_STATUS_OPTIONS: { id: MyListsStatusFilter; label: string }[] = [
  { id: 'all', label: 'Все списки' },
  { id: 'watching', label: MY_LISTS_STATUS_LABELS.watching },
  { id: 'planned', label: MY_LISTS_STATUS_LABELS.planned },
  { id: 'on_hold', label: MY_LISTS_STATUS_LABELS.on_hold },
  { id: 'completed', label: MY_LISTS_STATUS_LABELS.completed },
  { id: 'dropped', label: MY_LISTS_STATUS_LABELS.dropped },
];

const TMDB_STATUS_EXACT = new Set([
  'Released',
  'Returning Series',
  'Ended',
  'In Production',
  'Post Production',
  'Planned',
  'Canceled',
  'Cancelled',
  'Rumored',
  'On Hiatus',
]);

function isTmdbMediaStatus(status: unknown): boolean {
  if (status == null) return false;
  const trimmed = String(status).trim();
  if (!trimmed) return false;
  if (TMDB_STATUS_EXACT.has(trimmed)) return true;

  const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ');
  if (!normalized) return false;
  if (normalized.includes('return') && normalized.includes('series')) return true;
  if (normalized === 'in production' || normalized === 'post production') return true;
  if (normalized.includes('post production')) return true;
  if (normalized === 'released') return true;
  if (normalized === 'ended') return true;
  if (normalized.includes('cancel')) return true;
  if (normalized === 'rumored') return true;
  if (normalized.includes('hiatus')) return true;
  return false;
}

const LIST_STATUS_ALIASES: Record<string, UserAnimeStatus> = {
  plan_to_watch: 'planned',
  plantowatch: 'planned',
  plan_to_see: 'planned',
  onhold: 'on_hold',
  paused: 'on_hold',
};

const USER_STATUS_FROM_LABEL: Record<string, UserAnimeStatus> = {
  смотрю: 'watching',
  'в планах': 'planned',
  планирую: 'planned',
  просмотрено: 'completed',
  просмотрен: 'completed',
  завершено: 'completed',
  брошено: 'dropped',
  брошен: 'dropped',
  отложено: 'on_hold',
};

const STATUS_CODE_MAP: Record<string, UserAnimeStatus> = {
  '1': 'watching',
  '2': 'planned',
  '3': 'completed',
  '4': 'dropped',
  '5': 'on_hold',
};

export function showAnimeLists(media: MyListsMediaFilter): boolean {
  return media === 'all' || media === 'anime';
}

export function showLampaLists(media: MyListsMediaFilter): boolean {
  return media === 'all' || media === 'movie' || media === 'tv';
}

export function normalizeListStatus(status: unknown): UserAnimeStatus | 'none' {
  if (status == null) return 'none';
  if (isTmdbMediaStatus(status)) return 'none';

  const raw = String(status).trim().toLowerCase().replace(/-/g, '_');
  if (!raw) return 'none';

  if (LIST_STATUS_ALIASES[raw]) return LIST_STATUS_ALIASES[raw];
  if ((MY_LISTS_STATUS_ORDER as readonly string[]).includes(raw)) {
    return raw as UserAnimeStatus;
  }

  const labelKey = String(status).trim().toLowerCase();
  if (USER_STATUS_FROM_LABEL[labelKey]) return USER_STATUS_FROM_LABEL[labelKey];
  if (STATUS_CODE_MAP[raw]) return STATUS_CODE_MAP[raw];

  return 'none';
}

export function getSavedLampaUserStatus(entry: Record<string, unknown>): unknown {
  const candidates = [entry.status, (entry.savedLampa as Record<string, unknown> | undefined)?.status];
  for (const candidate of candidates) {
    if (candidate == null || String(candidate).trim() === '') continue;
    if (isTmdbMediaStatus(candidate)) continue;
    return candidate;
  }
  return undefined;
}

export function hasLampaListStatus(entry: Record<string, unknown>): boolean {
  return hasListStatus(getSavedLampaUserStatus(entry));
}

export function getLampaKind(entry: Record<string, unknown>): string {
  const nested = entry.lampa as { kind?: string } | undefined;
  return String(nested?.kind ?? entry.kind ?? 'movie');
}

export function hasListStatus(itemStatus: unknown): boolean {
  return normalizeListStatus(itemStatus) !== 'none';
}

export function matchesStatusFilter(
  itemStatus: unknown,
  status: MyListsStatusFilter,
): boolean {
  if (!hasListStatus(itemStatus)) return false;
  if (status === 'all') return true;
  return normalizeListStatus(itemStatus) === status;
}

export function animeMatchesStatusFilter(
  item: SavedAnimeItem,
  status: MyListsStatusFilter,
): boolean {
  return matchesStatusFilter(item.status, status);
}

export function countLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} тайтл`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} тайтла`;
  return `${n} тайтлов`;
}
