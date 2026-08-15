import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Href } from 'expo-router';
import type { ComponentProps } from 'react';

import type { Ionicons } from '@expo/vector-icons';

import { moveInList } from '@/lib/homeSettings';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export const HOME_QUICK_ACTIONS_RAIL_PRIORITY = -0.5;

export const HOME_QUICK_ACTION_IDS = [
  'bookmarks',
  'lists',
  'collections',
  'history',
  'search',
  'schedule',
  'friends',
  'profile',
  'anime',
  'movies',
  'series',
  'party',
] as const;

export type HomeQuickActionId = (typeof HOME_QUICK_ACTION_IDS)[number];

export const DEFAULT_HOME_QUICK_ACTION_IDS: HomeQuickActionId[] = [
  'bookmarks',
  'lists',
  'collections',
  'history',
];

const HOME_QUICK_ACTION_ID_SET = new Set<string>(HOME_QUICK_ACTION_IDS);

export interface HomeQuickActionDef {
  id: HomeQuickActionId;
  title: string;
  subtitle: string;
  icon: IoniconName;
  href: Href;
}

export const HOME_QUICK_ACTIONS: Record<HomeQuickActionId, HomeQuickActionDef> = {
  bookmarks: {
    id: 'bookmarks',
    title: 'Закладки',
    subtitle: 'Избранное',
    icon: 'bookmark',
    href: '/library/bookmarks',
  },
  lists: {
    id: 'lists',
    title: 'Медиатека',
    subtitle: 'Персональные подборки',
    icon: 'list',
    href: '/library/lists',
  },
  collections: {
    id: 'collections',
    title: 'Коллекции',
    subtitle: 'Ваши подборки',
    icon: 'albums',
    href: '/library/collections',
  },
  history: {
    id: 'history',
    title: 'История',
    subtitle: 'Недавние тайтлы',
    icon: 'time',
    href: '/history',
  },
  search: {
    id: 'search',
    title: 'Поиск',
    subtitle: 'Найти тайтл',
    icon: 'search',
    href: '/search',
  },
  schedule: {
    id: 'schedule',
    title: 'Расписание',
    subtitle: 'Онгоинги по дням',
    icon: 'calendar',
    href: '/schedule',
  },
  friends: {
    id: 'friends',
    title: 'Друзья',
    subtitle: 'Лента и заявки',
    icon: 'people',
    href: '/friends/feed',
  },
  profile: {
    id: 'profile',
    title: 'Профиль',
    subtitle: 'Аккаунт и настройки',
    icon: 'person',
    href: '/profile',
  },
  anime: {
    id: 'anime',
    title: 'Аниме',
    subtitle: 'Каталог аниме',
    icon: 'sparkles',
    href: '/anime',
  },
  movies: {
    id: 'movies',
    title: 'Фильмы',
    subtitle: 'Каталог фильмов',
    icon: 'film',
    href: '/movies',
  },
  series: {
    id: 'series',
    title: 'Сериалы',
    subtitle: 'Каталог сериалов',
    icon: 'tv',
    href: '/series',
  },
  party: {
    id: 'party',
    title: 'Комната',
    subtitle: 'Совместный просмотр',
    icon: 'people-circle',
    href: '/party',
  },
};

const STORAGE_KEY = 'sleek_tv_home_quick_actions';

type QuickActionsListener = () => void;
const listeners = new Set<QuickActionsListener>();

export function subscribeHomeQuickActions(listener: QuickActionsListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyHomeQuickActionsChanged() {
  listeners.forEach((listener) => listener());
}

export function isHomeQuickActionId(value: unknown): value is HomeQuickActionId {
  return typeof value === 'string' && HOME_QUICK_ACTION_ID_SET.has(value);
}

/** Missing / invalid payload → phone defaults. Explicit `[]` hides the TV rail. */
export function normalizeHomeQuickActionIds(raw: unknown): HomeQuickActionId[] {
  if (!Array.isArray(raw)) return [...DEFAULT_HOME_QUICK_ACTION_IDS];
  const seen = new Set<HomeQuickActionId>();
  const ordered: HomeQuickActionId[] = [];
  for (const item of raw) {
    if (!isHomeQuickActionId(item) || seen.has(item)) continue;
    seen.add(item);
    ordered.push(item);
  }
  return ordered;
}

export function resolveHomeQuickActions(ids: HomeQuickActionId[]): HomeQuickActionDef[] {
  return ids.map((id) => HOME_QUICK_ACTIONS[id]);
}

export function toggleHomeQuickAction(
  ids: HomeQuickActionId[],
  id: HomeQuickActionId,
  enabled: boolean,
): HomeQuickActionId[] {
  const next = ids.filter((item) => item !== id);
  if (!enabled) return next;
  return [...next, id];
}

export function moveHomeQuickAction(
  ids: HomeQuickActionId[],
  id: HomeQuickActionId,
  direction: -1 | 1,
): HomeQuickActionId[] {
  const index = ids.indexOf(id);
  if (index < 0) return ids;
  return moveInList(ids, index, direction);
}

export async function loadHomeQuickActions(): Promise<HomeQuickActionId[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_HOME_QUICK_ACTION_IDS];
    return normalizeHomeQuickActionIds(JSON.parse(raw));
  } catch {
    return [...DEFAULT_HOME_QUICK_ACTION_IDS];
  }
}

export async function saveHomeQuickActions(ids: HomeQuickActionId[]): Promise<void> {
  const normalized = normalizeHomeQuickActionIds(ids);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  notifyHomeQuickActionsChanged();
}
