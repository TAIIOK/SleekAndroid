import { createContext, useCallback, useContext, type ReactNode } from 'react';
import type { View } from 'react-native';

import { useTvCatalogVerticalNeighbors } from '@/hooks/useTvCatalogVerticalNeighbors';
import { registerTvCatalogRail } from '@/lib/tvCatalogVerticalFocus';
import { isTvUi } from '@/lib/isTvUi';

export const DETAIL_FOCUS_PLAY = 0;
/** Status row directly under Play. Down from Play must land here. */
export const DETAIL_FOCUS_LIBRARY = 5;
/** Season chips sit between the library row and the episode window. */
export const DETAIL_FOCUS_SEASONS = 8;
export const DETAIL_FOCUS_EPISODES = 10;
export const DETAIL_FOCUS_EPISODE_TAIL = 15;
export const DETAIL_FOCUS_CHARACTERS = 20;
export const DETAIL_FOCUS_RELATED = 30;
export const DETAIL_FOCUS_RECOMMENDATIONS = 40;
export const DETAIL_FOCUS_SIMILAR = 50;

const DetailFocusPathContext = createContext<string | null>(null);

export function detailFocusPath(kind: string, id: string | number): string {
  return `detail:${kind}:${id}`;
}

export function DetailFocusScope({
  focusPath,
  children,
}: {
  focusPath: string;
  children: ReactNode;
}) {
  if (!isTvUi()) return children;
  return (
    <DetailFocusPathContext.Provider value={focusPath}>{children}</DetailFocusPathContext.Provider>
  );
}

export function useDetailFocusPath(): string | undefined {
  return useContext(DetailFocusPathContext) ?? undefined;
}

/** Registers one detail row in the vertical D-pad graph. Omit priority to stay out of the graph. */
export function useDetailFocusSlot(priority?: number): {
  hostRef?: (node: View | null) => void;
  nextFocusUp?: number;
  nextFocusDown?: number;
} {
  const path = useContext(DetailFocusPathContext);
  const enabled = isTvUi() && path != null && priority != null;
  const neighbors = useTvCatalogVerticalNeighbors(
    enabled ? path : undefined,
    enabled ? priority : undefined,
  );
  const hostRef = useCallback(
    (node: View | null) => {
      if (!path || !isTvUi() || priority == null) return;
      registerTvCatalogRail(path, priority, node);
    },
    [path, priority],
  );
  if (!enabled) return {};
  return {
    hostRef,
    nextFocusUp: neighbors.up,
    nextFocusDown: neighbors.down,
  };
}
