export {
  DEFAULT_HOME_SECTION_ORDER,
  EMPTY_HOME_CONFIG,
  type AnimeCustomSectionConfig,
  type CatalogHomeConfig,
  type HomeSectionId,
} from '@aniverse/catalog';

export {
  applyHomeSectionToggles,
  dedupeAnimeRailsByPath,
  filterLampaSectionsForHomeKind,
  homeSectionLabel,
  inferHomeConfigConfigured,
  isHomeConfigConfigured,
  isHomeExcludedAnimeRecommendationSection,
  materializeLampaSectionDefaults,
  moveInList,
  normalizeHomeConfig,
  resolveAnimeCustomSections,
  resolveAnimeShowcaseIds,
  resolveEnabledContentTypes,
  resolveEnabledHomeSections,
  resolveEnabledRecommendationShowcaseIds,
  resolveHideAsianLiveAction,
  resolveHomeSectionOrder,
  resolveLampaSectionEndpoints,
  resolveRecommendationFeedSectionIds,
  resolveRegularAnimeShowcaseIds,
  shouldExcludeCjkFromLampaSection,
} from '@aniverse/catalog';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { normalizeHomeConfig } from '@aniverse/catalog';
import type { CatalogHomeConfig } from '@aniverse/catalog';

const STORAGE_KEY = 'sleek_catalog_home_config';
const UPDATED_AT_KEY = 'sleek_catalog_home_config_updated';

type HomeConfigListener = () => void;
const listeners = new Set<HomeConfigListener>();

export function subscribeHomeConfig(listener: HomeConfigListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyHomeConfigChanged() {
  listeners.forEach((listener) => listener());
}

export async function loadHomeConfig(): Promise<CatalogHomeConfig> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizeHomeConfig(null);
    return normalizeHomeConfig(JSON.parse(raw) as Partial<CatalogHomeConfig>);
  } catch {
    return normalizeHomeConfig(null);
  }
}

export async function getHomeConfigUpdatedAt(): Promise<number> {
  const raw = await AsyncStorage.getItem(UPDATED_AT_KEY);
  if (!raw) return 0;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

export async function saveHomeConfig(config: CatalogHomeConfig): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  await AsyncStorage.setItem(UPDATED_AT_KEY, String(Date.now()));
  notifyHomeConfigChanged();
}
