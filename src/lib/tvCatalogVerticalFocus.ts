import { findNodeHandle } from 'react-native';

import type { TvCatalogRailSlot, TvCatalogVerticalSnapshot } from '@/lib/tvCatalogVerticalFocusTypes';

export type { TvCatalogRailSlot, TvCatalogVerticalSnapshot } from '@/lib/tvCatalogVerticalFocusTypes';
export { catalogVerticalNeighbors } from '@/lib/tvCatalogVerticalNeighbors';

type FocusHost = {
  requestTVFocus?: () => void;
};

type RailEntry = {
  host: FocusHost;
  tag?: number;
};

type PathState = {
  chromePrimaryHost: FocusHost | null;
  chromeSecondaryHost: FocusHost | null;
  chromePrimaryTag?: number;
  chromeSecondaryTag?: number;
  rails: Map<number, RailEntry>;
  snapshot: TvCatalogVerticalSnapshot;
  listeners: Set<() => void>;
};

const paths = new Map<string, PathState>();

function asHost(node: unknown): FocusHost | null {
  return node != null ? (node as FocusHost) : null;
}

function nativeTag(node: unknown): number | undefined {
  if (node == null) return undefined;
  return findNodeHandle(node as Parameters<typeof findNodeHandle>[0]) ?? undefined;
}

function rememberTag(node: unknown, apply: (tag: number) => void) {
  const tag = nativeTag(node);
  if (tag != null) {
    apply(tag);
    return;
  }
  queueMicrotask(() => {
    const retry = nativeTag(node);
    if (retry != null) apply(retry);
  });
}

function ensurePath(path: string): PathState {
  let state = paths.get(path);
  if (state) return state;
  state = {
    chromePrimaryHost: null,
    chromeSecondaryHost: null,
    rails: new Map(),
    snapshot: { rails: [] },
    listeners: new Set(),
  };
  paths.set(path, state);
  return state;
}

function rebuildSnapshot(state: PathState): TvCatalogVerticalSnapshot {
  const rails: TvCatalogRailSlot[] = [];
  for (const [priority, entry] of state.rails) {
    if (entry.tag != null) rails.push({ priority, tag: entry.tag });
  }
  rails.sort((a, b) => a.priority - b.priority);
  return {
    ...(state.chromePrimaryTag != null ? { chromePrimaryTag: state.chromePrimaryTag } : {}),
    ...(state.chromeSecondaryTag != null ? { chromeSecondaryTag: state.chromeSecondaryTag } : {}),
    rails,
  };
}

const pendingNotify = new Set<string>();
let notifyFrame: ReturnType<typeof requestAnimationFrame> | null = null;

function scheduleFrame(callback: () => void): ReturnType<typeof requestAnimationFrame> {
  if (typeof requestAnimationFrame === 'function') {
    return requestAnimationFrame(callback);
  }
  return setTimeout(callback, 0) as unknown as ReturnType<typeof requestAnimationFrame>;
}

function emit(path: string) {
  const state = ensurePath(path);
  state.snapshot = rebuildSnapshot(state);
  pendingNotify.add(path);
  if (notifyFrame != null) return;
  notifyFrame = scheduleFrame(() => {
    notifyFrame = null;
    const batch = [...pendingNotify];
    pendingNotify.clear();
    for (const nextPath of batch) {
      paths.get(nextPath)?.listeners.forEach((listener) => listener());
    }
  });
}

export function subscribeTvCatalogVertical(path: string, listener: () => void): () => void {
  const state = ensurePath(path);
  state.listeners.add(listener);
  return () => {
    state.listeners.delete(listener);
  };
}

export function getTvCatalogVerticalSnapshot(path: string): TvCatalogVerticalSnapshot {
  return ensurePath(path).snapshot;
}

export function registerTvCatalogChrome(
  path: string,
  node: unknown,
  slot: 'primary' | 'secondary' = 'primary',
) {
  if (node == null) return;
  const state = ensurePath(path);
  const host = asHost(node);
  if (slot === 'primary') state.chromePrimaryHost = host;
  else state.chromeSecondaryHost = host;
  rememberTag(node, (tag) => {
    if (slot === 'primary') {
      if (state.chromePrimaryTag === tag) return;
      state.chromePrimaryTag = tag;
    } else {
      if (state.chromeSecondaryTag === tag) return;
      state.chromeSecondaryTag = tag;
    }
    emit(path);
  });
}

export function registerTvCatalogRail(path: string, priority: number, node: unknown) {
  if (node == null) return;
  const host = asHost(node);
  if (!host) return;
  const state = ensurePath(path);
  const entry: RailEntry = state.rails.get(priority) ?? { host };
  entry.host = host;
  state.rails.set(priority, entry);
  rememberTag(node, (tag) => {
    if (entry.tag === tag) return;
    entry.tag = tag;
    emit(path);
  });
}

export function requestTvCatalogChromeFocus(path: string) {
  const state = paths.get(path);
  (state?.chromePrimaryHost ?? state?.chromeSecondaryHost)?.requestTVFocus?.();
}

export function requestTvCatalogRailFocus(path: string, minPriority = 0) {
  const state = paths.get(path);
  if (!state) return;
  const sorted = [...state.rails.entries()].sort((a, b) => a[0] - b[0]);
  const match = sorted.find(([priority]) => priority >= minPriority);
  match?.[1].host.requestTVFocus?.();
}
