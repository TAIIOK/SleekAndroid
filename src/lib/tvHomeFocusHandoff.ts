import { HOME_QUICK_ACTIONS_RAIL_PRIORITY } from '@/lib/homeQuickActions';
import {
  getTvCatalogVerticalSnapshot,
  registerTvCatalogChrome,
  registerTvCatalogRail,
  requestTvCatalogChromeFocus,
  requestTvCatalogRailFocus,
  subscribeTvCatalogVertical,
} from '@/lib/tvCatalogVerticalFocus';

const HOME = '/';

export type TvHomeHandoffSnapshot = {
  filtersTag?: number;
  tabsTag?: number;
  catalogTag?: number;
};

/** Type-filter chip — Up from Continue Watching when feed tabs are absent. */
export function registerTvHomeFiltersFocus(node: unknown) {
  registerTvCatalogChrome(HOME, node, 'secondary');
}

/** Feed tab — preferred Up target from Continue Watching (closer than type filters). */
export function registerTvHomeTabsFocus(node: unknown) {
  registerTvCatalogChrome(HOME, node, 'primary');
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
  const catalog = snapshot.rails.find(
    (rail) => rail.priority >= HOME_QUICK_ACTIONS_RAIL_PRIORITY,
  );
  return {
    ...(snapshot.chromeSecondaryTag != null ? { filtersTag: snapshot.chromeSecondaryTag } : {}),
    ...(snapshot.chromePrimaryTag != null ? { tabsTag: snapshot.chromePrimaryTag } : {}),
    ...(catalog?.tag != null ? { catalogTag: catalog.tag } : {}),
  };
}

export function requestTvHomeChromeFocus() {
  requestTvCatalogChromeFocus(HOME);
}

export function requestTvHomeCatalogFocus() {
  requestTvCatalogRailFocus(HOME, HOME_QUICK_ACTIONS_RAIL_PRIORITY);
}
