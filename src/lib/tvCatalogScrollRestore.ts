/**
 * Persist catalog scroll + focused rail card across detail navigation (Back).
 * Keyed by route path (e.g. `/`, `/movies`).
 */

export type TvCatalogScrollSnapshot = {
  scrollY: number;
  railKey?: string;
  itemIndex?: number;
};

const snapshots = new Map<string, TvCatalogScrollSnapshot>();

export function saveCatalogScrollSnapshot(
  path: string,
  snapshot: TvCatalogScrollSnapshot,
): void {
  const key = path.trim() || '/';
  snapshots.set(key, {
    scrollY: Math.max(0, snapshot.scrollY),
    railKey: snapshot.railKey,
    itemIndex: snapshot.itemIndex,
  });
}

export function peekCatalogScrollSnapshot(
  path: string,
): TvCatalogScrollSnapshot | undefined {
  return snapshots.get(path.trim() || '/');
}

export function consumeCatalogScrollSnapshot(
  path: string,
): TvCatalogScrollSnapshot | undefined {
  const key = path.trim() || '/';
  const value = snapshots.get(key);
  if (value) snapshots.delete(key);
  return value;
}

/** Drop saved scroll/focus for a path (top-level sidebar nav — fresh content entry). */
export function clearCatalogScrollSnapshot(path: string): void {
  snapshots.delete(path.trim() || '/');
}

const freshLandings = new Set<string>();

/** TV sidebar hub switch: destination catalog should land at y=0, not leftover scroll. */
export function markCatalogFreshLanding(path: string): void {
  freshLandings.add(path.trim() || '/');
}

export function takeCatalogFreshLanding(path: string): boolean {
  const key = path.trim() || '/';
  if (!freshLandings.has(key)) return false;
  freshLandings.delete(key);
  return true;
}

/** Live focus tracker for the active catalog screen (updated by rails). */
let activeFocus: { path: string; railKey: string; itemIndex: number } | null = null;

export function setCatalogActiveFocus(
  path: string,
  railKey: string,
  itemIndex: number,
): void {
  activeFocus = { path, railKey, itemIndex };
}

export function getCatalogActiveFocus(
  path: string,
): { railKey: string; itemIndex: number } | null {
  if (!activeFocus || activeFocus.path !== path) return null;
  return { railKey: activeFocus.railKey, itemIndex: activeFocus.itemIndex };
}

export function clearCatalogActiveFocus(path?: string): void {
  if (!path || activeFocus?.path === path) activeFocus = null;
}

/** Pending focus restore after Back (consumed by the matching rail). */
let pendingFocus: { path: string; railKey: string; itemIndex: number } | null = null;

export function setPendingCatalogFocusRestore(
  path: string,
  railKey: string,
  itemIndex: number,
): void {
  pendingFocus = { path, railKey, itemIndex };
}

export function takePendingCatalogFocusRestore(
  path: string,
  railKey: string,
): number | null {
  if (!pendingFocus || pendingFocus.path !== path || pendingFocus.railKey !== railKey) {
    return null;
  }
  const index = pendingFocus.itemIndex;
  pendingFocus = null;
  return index;
}

export function clearPendingCatalogFocusRestore(path?: string): void {
  if (!path || pendingFocus?.path === path) pendingFocus = null;
}
