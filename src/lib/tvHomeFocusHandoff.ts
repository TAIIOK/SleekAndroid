import { HOME_QUICK_ACTIONS_RAIL_PRIORITY } from '@/lib/homeQuickActions';
import {
  getTvCatalogVerticalSnapshot,
  registerTvCatalogRail,
  requestTvCatalogChromeFocus,
  requestTvCatalogRailFocus,
  subscribeTvCatalogVertical,
} from '@/lib/tvCatalogVerticalFocus';

const HOME = '/';

/** Continue-watching hero, above the continue rail (-1). */
export const HOME_HERO_RAIL_PRIORITY = -2;
/** Type filters, between quick actions (-0.5) and the catalog (0+). */
export const HOME_FILTERS_RAIL_PRIORITY = -0.4;
/** Feed tabs, directly under the type filters. */
export const HOME_TABS_RAIL_PRIORITY = -0.3;

export type TvHomeHandoffSnapshot = {
  filtersTag?: number;
  tabsTag?: number;
  catalogTag?: number;
};

/** Type-filter chip — sits under Quick Actions, above feed tabs. */
export function registerTvHomeFiltersFocus(node: unknown) {
  registerTvCatalogRail(HOME, HOME_FILTERS_RAIL_PRIORITY, node);
}

/** Feed tab — directly under the type filters, above the catalog. */
export function registerTvHomeTabsFocus(node: unknown) {
  registerTvCatalogRail(HOME, HOME_TABS_RAIL_PRIORITY, node);
}

/** Continue-watching hero play button — Up target from the continue rail. */
export function registerTvHomeHeroFocus(node: unknown) {
  registerTvCatalogRail(HOME, HOME_HERO_RAIL_PRIORITY, node);
}

/** First row below Continue Watching (Quick Actions or catalog) — Down target. */
export function registerTvHomeCatalogFocus(node: unknown, priority = 0) {
  registerTvCatalogRail(HOME, priority, node);
}

export function subscribeTvHomeHandoff(listener: () => void): () => void {
  return subscribeTvCatalogVertical(HOME, listener);
}

export function getTvHomeHandoffSnapshot(): TvHomeHandoffSnapshot {
  const snapshot = getTvCatalogVerticalSnapshot(HOME);
  const filters = snapshot.rails.find((rail) => rail.priority === HOME_FILTERS_RAIL_PRIORITY);
  const tabs = snapshot.rails.find((rail) => rail.priority === HOME_TABS_RAIL_PRIORITY);
  const catalog = snapshot.rails.find((rail) => rail.priority >= 0);
  return {
    ...(filters?.tag != null ? { filtersTag: filters.tag } : {}),
    ...(tabs?.tag != null ? { tabsTag: tabs.tag } : {}),
    ...(catalog?.tag != null ? { catalogTag: catalog.tag } : {}),
  };
}

export function requestTvHomeChromeFocus() {
  requestTvCatalogChromeFocus(HOME);
}

export function requestTvHomeCatalogFocus() {
  requestTvCatalogRailFocus(HOME, HOME_QUICK_ACTIONS_RAIL_PRIORITY);
}
