import {
  applyHomeSectionToggles,
  homeSectionLabel,
  isHomeConfigConfigured,
  materializeLampaSectionDefaults,
  moveInList,
  normalizeHomeConfig,
  resolveAnimeShowcaseIds,
  resolveEnabledContentTypes,
  resolveEnabledHomeSections,
  resolveHomeSectionOrder,
  resolveLampaSectionEndpoints,
  type CatalogHomeConfig,
  type HomeSectionId,
} from '@/lib/homeSettings';

export {
  applyHomeSectionToggles,
  homeSectionLabel,
  materializeLampaSectionDefaults,
  moveInList,
  resolveEnabledHomeSections,
  resolveHomeSectionOrder,
  resolveLampaSectionEndpoints,
  type HomeSectionId,
};

/** Default catalog showcases for first-time home (no personalized rails). */
export const ANIME_DEFAULT_REGULAR_SHOWCASE_IDS = [
  'trending',
  'recent',
  'rating',
  'random',
];

export interface SettingsDraftOptions {
  contentTypeIds: string[];
  showcaseIds: string[];
  lampaSectionsByKind: Record<string, string[]>;
}

export function buildSettingsDraft(
  config: CatalogHomeConfig,
  options: SettingsDraftOptions,
): CatalogHomeConfig {
  if (isHomeConfigConfigured(config)) {
    return normalizeHomeConfig(config);
  }

  const lampaSections = Object.fromEntries(
    Object.entries(options.lampaSectionsByKind).map(([kind, endpoints]) => [
      kind,
      resolveLampaSectionEndpoints(config, kind, endpoints),
    ]),
  );

  return normalizeHomeConfig({
    ...config,
    configured: false,
    enabledContentTypes: resolveEnabledContentTypes(config, options.contentTypeIds),
    enabledAnimeShowcases: resolveAnimeShowcaseIds(config, options.showcaseIds),
    enabledLampaSections: lampaSections,
  });
}

export function toggleInList(
  list: string[],
  id: string,
  enabled: boolean,
  order?: string[],
): string[] {
  if (enabled) {
    if (list.includes(id)) return list;
    const next = [...list, id];
    if (!order?.length) return next;
    return order
      .filter((item) => next.includes(item))
      .concat(next.filter((item) => !order.includes(item)));
  }
  return list.filter((item) => item !== id);
}

export function toggleLampaSection(
  config: CatalogHomeConfig,
  kind: string,
  endpoint: string,
  enabled: boolean,
  order?: string[],
): CatalogHomeConfig {
  const current = config.enabledLampaSections[kind] ?? [];
  const nextList = toggleInList(current, endpoint, enabled, order);
  const nextSections = { ...config.enabledLampaSections };
  if (nextList.length) nextSections[kind] = nextList;
  else delete nextSections[kind];
  return { ...config, enabledLampaSections: nextSections };
}

function newSectionId(): string {
  return `section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeCatalogPath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

export function addAnimeCustomSection(
  config: CatalogHomeConfig,
  title: string,
  path: string,
): CatalogHomeConfig {
  const normalizedPath = normalizeCatalogPath(path);
  if (config.enabledAnimeCustomSections.some((section) => section.path === normalizedPath)) {
    return config;
  }
  return {
    ...config,
    enabledAnimeCustomSections: [
      ...config.enabledAnimeCustomSections,
      { id: newSectionId(), title, path: normalizedPath },
    ],
  };
}

export function removeAnimeCustomSection(
  config: CatalogHomeConfig,
  sectionId: string,
): CatalogHomeConfig {
  return {
    ...config,
    enabledAnimeCustomSections: config.enabledAnimeCustomSections.filter(
      (section) => section.id !== sectionId,
    ),
  };
}

export function buildAnimeFilterPath(
  filter: { itemPathTemplate?: string; id?: string; path?: string },
  value: string,
): string | null {
  if (filter.itemPathTemplate) {
    if (filter.itemPathTemplate.includes('{id}')) {
      return filter.itemPathTemplate.replace('{id}', value);
    }
    return filter.itemPathTemplate.replace('{value}', value);
  }
  if (filter.id === 'seasonal' && filter.path) {
    const [year, season] = value.split(':');
    if (!year || !season) return null;
    const base = filter.path.startsWith('/') ? filter.path : `/${filter.path}`;
    return `${base}?year=${year}&season=${season}`;
  }
  return null;
}

export function animeFilterDisplayName(id: string): string {
  switch (id) {
    case 'type':
      return 'Тип';
    case 'status':
      return 'Статус';
    case 'year':
      return 'Год';
    case 'genre':
      return 'Жанр';
    case 'seasonal':
      return 'Сезон';
    default:
      return id;
  }
}
