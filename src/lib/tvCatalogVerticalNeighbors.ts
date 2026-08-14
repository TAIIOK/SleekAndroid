import type { TvCatalogVerticalSnapshot } from './tvCatalogVerticalFocusTypes';

export type { TvCatalogRailSlot, TvCatalogVerticalSnapshot } from './tvCatalogVerticalFocusTypes';

export function catalogVerticalNeighbors(
  snapshot: TvCatalogVerticalSnapshot,
  priority: number,
): { up?: number; down?: number } {
  const chrome = snapshot.chromePrimaryTag ?? snapshot.chromeSecondaryTag;
  const rails = snapshot.rails;
  const index = rails.findIndex((rail) => rail.priority === priority);
  if (index < 0) {
    return { up: chrome, down: rails[0]?.tag };
  }
  return {
    up: rails[index - 1]?.tag ?? chrome,
    down: rails[index + 1]?.tag,
  };
}
