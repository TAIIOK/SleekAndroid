import {
  isAnimeRecommendationShowcaseId,
  isLampaRecommendationEndpoint,
} from '@aniverse/catalog';
import type { CatalogShowcase, LampaSection } from '@/api/catalog';
import {
  EMPTY_HOME_CONFIG,
  dedupeAnimeRailsByPath,
  filterLampaSectionsForHomeKind,
  isHomeConfigConfigured,
  isHomeExcludedAnimeRecommendationSection,
  resolveAnimeCustomSections,
  resolveAnimeShowcaseIds,
  resolveEnabledHomeSections,
  resolveHomeSectionOrder,
  resolveLampaSectionEndpoints,
  type CatalogHomeConfig,
  type HomeSectionId,
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

/** Type chips available from the user's enabled home sections. */
export function resolveAvailableTvHomeTypeFilters(
  enabledTypes: string[],
  config: CatalogHomeConfig = EMPTY_HOME_CONFIG,
): { id: TvHomeTypeFilter; label: string }[] {
  const sections = resolveEnabledHomeSections({
    ...config,
    enabledContentTypes: enabledTypes,
  });
  return TV_HOME_TYPE_FILTERS.filter((option) => {
    if (option.id === 'all') return sections.length > 0;
    if (option.id === 'anime') return sections.includes('anime');
    if (option.id === 'movie') return sections.includes('movie');
    return sections.includes('tv');
  });
}

function collectAnimeSources(
  options: Omit<ResolveTvHomeOptions, 'tab'>,
  disambiguate: boolean,
): TvHomeFeedSource[] {
  const { config, animeShowcases } = options;
  const sources: TvHomeFeedSource[] = [];
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

  return sources;
}

function collectLampaKindSources(
  options: Omit<ResolveTvHomeOptions, 'tab'>,
  kind: 'movie' | 'tv',
  disambiguate: boolean,
): TvHomeFeedSource[] {
  const { config, lampaMovieSections, lampaTvSections, firstLampaKindId } = options;
  const sections = kind === 'movie' ? lampaMovieSections : lampaTvSections;
  const endpoints = resolveLampaSectionEndpoints(
    config,
    kind,
    sections.map((section) => section.endpoint),
  );
  const ordered = orderLampaSections(sections, endpoints, config, kind);
  const visible = filterLampaSectionsForHomeKind(ordered, kind, firstLampaKindId);
  return visible.map((section) => {
    const name = section.title || section.endpoint;
    return {
      key: `${kind}:${section.endpoint}`,
      title: disambiguate ? `${name} · ${kindLabel(kind)}` : name,
      kind,
      lampaSection: section,
    };
  });
}

/** Catalog sources for the current type filter, filtered by home settings. */
export function listTvHomeCatalogSources(
  options: Omit<ResolveTvHomeOptions, 'tab'>,
): TvHomeFeedSource[] {
  const { filter, config, enabledTypes } = options;

  const animeEnabled = enabledTypes.includes('anime');
  const lampaEnabled = enabledTypes.includes('lampa');
  const includeAnime = animeEnabled && (filter === 'all' || filter === 'anime');
  const includeMovie = lampaEnabled && (filter === 'all' || filter === 'movie');
  const includeTv = lampaEnabled && (filter === 'all' || filter === 'tv');
  const disambiguate = filter === 'all';

  const bySection: Partial<Record<HomeSectionId, TvHomeFeedSource[]>> = {};
  if (includeAnime) bySection.anime = collectAnimeSources(options, disambiguate);
  if (includeMovie) bySection.movie = collectLampaKindSources(options, 'movie', disambiguate);
  if (includeTv) bySection.tv = collectLampaKindSources(options, 'tv', disambiguate);

  const enabledSections = resolveEnabledHomeSections({
    ...config,
    enabledContentTypes: enabledTypes,
  }).filter((id) => {
    if (id === 'anime') return includeAnime;
    if (id === 'movie') return includeMovie;
    return includeTv;
  });

  const order =
    filter === 'all'
      ? resolveHomeSectionOrder(config, enabledSections)
      : (enabledSections as HomeSectionId[]);

  const sources: TvHomeFeedSource[] = [];
  for (const sectionId of order) {
    sources.push(...(bySection[sectionId] ?? []));
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
