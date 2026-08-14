import { useSyncExternalStore } from 'react';

import {
  getTvCatalogVerticalSnapshot,
  subscribeTvCatalogVertical,
} from '@/lib/tvCatalogVerticalFocus';
import { catalogVerticalNeighbors } from '@/lib/tvCatalogVerticalNeighbors';
import type { TvCatalogVerticalSnapshot } from '@/lib/tvCatalogVerticalFocusTypes';

const EMPTY: TvCatalogVerticalSnapshot = { rails: [] };

export function useTvCatalogVerticalSnapshot(path?: string): TvCatalogVerticalSnapshot {
  return useSyncExternalStore(
    (onStoreChange) =>
      path ? subscribeTvCatalogVertical(path, onStoreChange) : () => undefined,
    () => (path ? getTvCatalogVerticalSnapshot(path) : EMPTY),
  );
}

export function useTvCatalogVerticalNeighbors(
  path?: string,
  priority?: number,
): { up?: number; down?: number } {
  const snapshot = useTvCatalogVerticalSnapshot(path);
  if (path == null || priority == null) return {};
  return catalogVerticalNeighbors(snapshot, priority);
}
