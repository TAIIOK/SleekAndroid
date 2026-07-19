import {
  isAnimeRecommendationShowcaseId,
  isLampaRecommendationEndpoint,
  type CatalogShowcase,
  type LampaSection,
} from '@/api/catalog';
import {
  dedupeAnimeRailsByPath,
  filterLampaSectionsForHomeKind,
  isHomeConfigConfigured,
  isHomeExcludedAnimeRecommendationSection,
  resolveAnimeCustomSections,
  resolveAnimeShowcaseIds,
  resolveLampaSectionEndpoints,
  type CatalogHomeConfig,
} from '@/lib/homeSettings';

/** `all` or a concrete source key (`anime:…` / `movie:…` / `tv:…` / `anime:custom:…`). */
export type TvHomeFeedTab = string;

export type TvHomeTypeFilter = 'all' | 'movie' | 'tv' | 'anime';

export type TvHomeFeedSource = {
  key: string;
  title: string;
  kind: 'anime' | 'movie' | 'tv';
  animePath?: string;
  lampaSection?: LampaSection;
};

export type TvHomeFeedTabOption = {
  id: TvHomeFeedTab;
  label: string;
};

export const TV_HOME_TYPE_FILTERS: { id: TvHomeTypeFilter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'movie', label: 'Фильмы' },
  { id: 'tv', label: 'Сериалы' },
  { id: 'anime', label: 'Аниме' },
];

/** Preferred anime showcase order when present in the catalog. */
const ANIME_SHOWCASE_PRIORITY = [
  'trending',
  'recent',
  'rating',
  'random',
  'upcoming',
  'seasonal',
  'airing',
  'for_you',
  'because_you_watched',
  'from_your_lists',
  'from_collections',
  'continue_watching',
];

const LAMPA_SECTION_PRIORITY = [
  'trending',
  'popular',
  'now_playing',
  'top_rated',
  'upcoming',
  'on_the_air',
  'airing_today',
];

type ResolveTvHomeOptions = {
  tab: TvHomeFeedTab;
  filter: TvHomeTypeFilter;
  config: CatalogHomeConfig;
  animeShowcases: CatalogShowcase[];
  lampaMovieSections: LampaSection[];
  lampaTvSections: LampaSection[];
  enabledTypes: string[];
  firstLampaKindId?: string;
};

function kindLabel(kind: TvHomeFeedSource['kind']): string {
  if (kind === 'anime') return 'Аниме';
  if (kind === 'movie') return 'Фильмы';
  return 'Сериалы';
}

function priorityIndex(id: string, priority: string[]): number {
  const normalized = id.toLowerCase();
  const index = priority.findIndex(
    (item) => normalized === item || normalized.includes(item),
  );
  return index === -1 ? priority.length + 1 : index;
}

function orderAnimeShowcases(
  showcases: CatalogShowcase[],
  enabledIds: string[],
  config: CatalogHomeConfig,
): CatalogShowcase[] {
  const byId = new Map(showcases.map((showcase) => [showcase.id, showcase]));

  if (isHomeConfigConfigured(config) && config.enabledAnimeShowcases.length) {
    return enabledIds
      .map((id) => byId.get(id))
      .filter((showcase): showcase is CatalogShowcase => Boolean(showcase?.path));
  }

  return [...showcases]
    .filter((showcase) => enabledIds.includes(showcase.id) && Boolean(showcase.path))
    .sort((a, b) => {
      const aRec = isAnimeRecommendationShowcaseId(a.id) ? 1 : 0;
      const bRec = isAnimeRecommendationShowcaseId(b.id) ? 1 : 0;
      if (aRec !== bRec) return aRec - bRec;
      const byPriority =
        priorityIndex(a.id, ANIME_SHOWCASE_PRIORITY) -
        priorityIndex(b.id, ANIME_SHOWCASE_PRIORITY);
      if (byPriority !== 0) return byPriority;
      return (a.name || a.id).localeCompare(b.name || b.id, 'ru');
    });
}

function orderLampaSections(
  sections: LampaSection[],
  enabledEndpoints: string[],
  config: CatalogHomeConfig,
  kind: 'movie' | 'tv',
): LampaSection[] {
  const byEndpoint = new Map(sections.map((section) => [section.endpoint, section]));

  if (isHomeConfigConfigured(config) && (config.enabledLampaSections[kind] ?? []).length) {
    return enabledEndpoints
      .map((endpoint) => byEndpoint.get(endpoint))
      .filter((section): section is LampaSection => Boolean(section));
  }

  return [...sections]
    .filter((section) => enabledEndpoints.includes(section.endpoint))
    .sort((a, b) => {
      const aRec = isLampaRecommendationEndpoint(a.endpoint) ? 1 : 0;
      const bRec = isLampaRecommendationEndpoint(b.endpoint) ? 1 : 0;
      if (aRec !== bRec) return aRec - bRec;
      const byPriority =
        priorityIndex(a.endpoint, LAMPA_SECTION_PRIORITY) -
        priorityIndex(b.endpoint, LAMPA_SECTION_PRIORITY);
      if (byPriority !== 0) return byPriority;
      return (a.title || a.endpoint).localeCompare(b.title || b.endpoint, 'ru');
    });
}

/** Type chips available from the user's enabled content types. */
export function resolveAvailableTvHomeTypeFilters(
  enabledTypes: string[],
): { id: TvHomeTypeFilter; label: string }[] {
  return TV_HOME_TYPE_FILTERS.filter((option) => {
    if (option.id === 'all') {
      return enabledTypes.includes('anime') || enabledTypes.includes('lampa');
    }
    if (option.id === 'anime') return enabledTypes.includes('anime');
    return enabledTypes.includes('lampa');
  });
}

/** Catalog sources for the current type filter, filtered by home settings. */
export function listTvHomeCatalogSources(
  options: Omit<ResolveTvHomeOptions, 'tab'>,
): TvHomeFeedSource[] {
  const {
    filter,
    config,
    animeShowcases,
    lampaMovieSections,
    lampaTvSections,
    enabledTypes,
    firstLampaKindId,
  } = options;

  const animeEnabled = enabledTypes.includes('anime');
  const lampaEnabled = enabledTypes.includes('lampa');
  const sources: TvHomeFeedSource[] = [];

  const includeAnime = animeEnabled && (filter === 'all' || filter === 'anime');
  const includeMovie = lampaEnabled && (filter === 'all' || filter === 'movie');
  const includeTv = lampaEnabled && (filter === 'all' || filter === 'tv');
  const disambiguate = filter === 'all';

  if (includeAnime) {
    const allIds = animeShowcases.map((showcase) => showcase.id);
    const enabledIds = resolveAnimeShowcaseIds(config, allIds).filter(
      (id) => !isHomeExcludedAnimeRecommendationSection(id),
    );
    const orderedShowcases = orderAnimeShowcases(animeShowcases, enabledIds, config);
    const customSections = resolveAnimeCustomSections(config);
    const { primary, secondary } = dedupeAnimeRailsByPath(orderedShowcases, customSections);

    for (const showcase of primary) {
      const name = showcase.name || showcase.id;
      sources.push({
        key: `anime:${showcase.id}`,
        title: disambiguate ? `${name} · ${kindLabel('anime')}` : name,
        kind: 'anime',
        animePath: showcase.path,
      });
    }

    for (const section of secondary) {
      const name = section.title || section.id;
      sources.push({
        key: `anime:custom:${section.id}`,
        title: disambiguate ? `${name} · ${kindLabel('anime')}` : name,
        kind: 'anime',
        animePath: section.path,
      });
    }
  }

  if (includeMovie) {
    const endpoints = resolveLampaSectionEndpoints(
      config,
      'movie',
      lampaMovieSections.map((section) => section.endpoint),
    );
    const ordered = orderLampaSections(lampaMovieSections, endpoints, config, 'movie');
    const visible = filterLampaSectionsForHomeKind(ordered, 'movie', firstLampaKindId);
    for (const section of visible) {
      const name = section.title || section.endpoint;
      sources.push({
        key: `movie:${section.endpoint}`,
        title: disambiguate ? `${name} · ${kindLabel('movie')}` : name,
        kind: 'movie',
        lampaSection: section,
      });
    }
  }

  if (includeTv) {
    const endpoints = resolveLampaSectionEndpoints(
      config,
      'tv',
      lampaTvSections.map((section) => section.endpoint),
    );
    const ordered = orderLampaSections(lampaTvSections, endpoints, config, 'tv');
    const visible = filterLampaSectionsForHomeKind(ordered, 'tv', firstLampaKindId);
    for (const section of visible) {
      const name = section.title || section.endpoint;
      sources.push({
        key: `tv:${section.endpoint}`,
        title: disambiguate ? `${name} · ${kindLabel('tv')}` : name,
        kind: 'tv',
        lampaSection: section,
      });
    }
  }

  return sources;
}

export function resolveTvHomeSources(options: ResolveTvHomeOptions): TvHomeFeedSource[] {
  const sources = listTvHomeCatalogSources(options);
  if (options.tab === 'all') return sources;
  return sources.filter((source) => source.key === options.tab);
}

/** Feed filter = «Все» + every enabled catalog source for the current type. */
export function resolveAvailableTvHomeFeedTabs(
  options: Omit<ResolveTvHomeOptions, 'tab'>,
): TvHomeFeedTabOption[] {
  const sources = listTvHomeCatalogSources(options);
  if (!sources.length) return [];

  return [
    { id: 'all', label: 'Все' },
    ...sources.map((source) => ({ id: source.key, label: source.title })),
  ];
}

/** How many concrete feeds (besides «Все») stay visible in the compact chip row. */
export const TV_HOME_FEED_PIN_COUNT = 4;

/**
 * Compact chrome: «Все» + first N feeds + selected (if overflow).
 * Remaining feeds are chosen via the «Ещё» picker.
 */
export function buildCompactTvHomeFeedRow(
  tabs: TvHomeFeedTabOption[],
  selectedId: TvHomeFeedTab,
  pinCount = TV_HOME_FEED_PIN_COUNT,
): {
  visible: TvHomeFeedTabOption[];
  hidden: TvHomeFeedTabOption[];
  moreLabel: string | null;
} {
  const allTab = tabs.find((tab) => tab.id === 'all');
  const rest = tabs.filter((tab) => tab.id !== 'all');
  const pinned = rest.slice(0, pinCount);
  const pinnedIds = new Set(pinned.map((tab) => tab.id));
  const selected =
    selectedId !== 'all' ? rest.find((tab) => tab.id === selectedId) : undefined;

  const visible: TvHomeFeedTabOption[] = [];
  if (allTab) visible.push(allTab);
  visible.push(...pinned);

  if (selected && !pinnedIds.has(selected.id)) {
    visible.push(selected);
  }

  const visibleIds = new Set(visible.map((tab) => tab.id));
  const hidden = rest.filter((tab) => !visibleIds.has(tab.id));
  const overflowCount = Math.max(0, rest.length - pinCount);

  return {
    visible,
    hidden,
    moreLabel: overflowCount > 0 ? `Ещё · ${overflowCount}` : null,
  };
}
