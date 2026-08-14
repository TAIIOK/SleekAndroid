import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from 'react';
import { Dimensions, View, type LayoutChangeEvent } from 'react-native';

import { layout } from '@/constants/aniverse';
import { estimateCatalogRailHeight } from '@/lib/catalogRailLayout';

type SlotLayout = { y: number; height: number };

type HomeScrollLazyStore = {
  scrollY: number;
  viewportHeight: number;
  margin: number;
  slots: Map<string, SlotLayout>;
  active: Map<string, boolean>;
  listeners: Map<string, Set<() => void>>;
};

function createStore(): HomeScrollLazyStore {
  return {
    scrollY: 0,
    viewportHeight: Dimensions.get('window').height,
    margin: layout.homeLazyRootMargin,
    slots: new Map(),
    active: new Map(),
    listeners: new Map(),
  };
}

function slotNear(store: HomeScrollLazyStore, key: string): boolean {
  const slot = store.slots.get(key);
  if (!slot) return false;
  const viewTop = store.scrollY - store.margin;
  const viewBottom = store.scrollY + store.viewportHeight + store.margin;
  const slotBottom = slot.y + slot.height;
  return slotBottom >= viewTop && slot.y <= viewBottom;
}

function resolveActive(store: HomeScrollLazyStore, key: string): boolean {
  // Deactivate when far so long homes do not keep every rail's posters mounted.
  return slotNear(store, key);
}

function recomputeSlot(store: HomeScrollLazyStore, key: string): void {
  const prev = store.active.get(key) ?? false;
  const next = resolveActive(store, key);
  if (prev === next) return;
  store.active.set(key, next);
  store.listeners.get(key)?.forEach((listener) => listener());
}

function recomputeAll(store: HomeScrollLazyStore): void {
  for (const key of store.slots.keys()) {
    recomputeSlot(store, key);
  }
}

type HomeScrollLazyContextValue = {
  contentRef: RefObject<View | null>;
  registerSlot: (key: string, layout: SlotLayout) => void;
  unregisterSlot: (key: string) => void;
  subscribe: (key: string, listener: () => void) => () => void;
  getActive: (key: string) => boolean;
  reportScrollY: (y: number) => void;
};

const HomeScrollLazyContext = createContext<HomeScrollLazyContextValue | null>(null);

let homeScrollLazyReporter: ((y: number) => void) | null = null;

export function notifyHomeScrollLazy(y: number): void {
  homeScrollLazyReporter?.(y);
}

export function HomeScrollLazyProvider({
  contentRef,
  children,
}: {
  contentRef: RefObject<View | null>;
  children: ReactNode;
}) {
  const storeRef = useRef<HomeScrollLazyStore>(createStore());
  const frameRef = useRef<number | null>(null);

  const flushScroll = useCallback(() => {
    frameRef.current = null;
    recomputeAll(storeRef.current);
  }, []);

  const reportScrollY = useCallback(
    (y: number) => {
      const store = storeRef.current;
      store.scrollY = Math.max(0, y);
      if (frameRef.current != null) return;
      frameRef.current = requestAnimationFrame(flushScroll);
    },
    [flushScroll],
  );

  const registerSlot = useCallback((key: string, slotLayout: SlotLayout) => {
    if (!key) return;
    storeRef.current.slots.set(key, slotLayout);
    recomputeSlot(storeRef.current, key);
  }, []);

  const unregisterSlot = useCallback((key: string) => {
    if (!key) return;
    storeRef.current.slots.delete(key);
    storeRef.current.active.delete(key);
    storeRef.current.listeners.delete(key);
  }, []);

  const subscribe = useCallback((key: string, listener: () => void) => {
    if (!key) return () => {};
    const store = storeRef.current;
    let set = store.listeners.get(key);
    if (!set) {
      set = new Set();
      store.listeners.set(key, set);
    }
    set.add(listener);
    return () => {
      set?.delete(listener);
    };
  }, []);

  const getActive = useCallback((key: string) => {
    return resolveActive(storeRef.current, key);
  }, []);

  useEffect(() => {
    const onDimChange = ({ window }: { window: { height: number } }) => {
      storeRef.current.viewportHeight = window.height;
      recomputeAll(storeRef.current);
    };
    const sub = Dimensions.addEventListener('change', onDimChange);
    return () => sub.remove();
  }, []);

  const value = useMemo(
    () => ({ contentRef, registerSlot, unregisterSlot, subscribe, getActive, reportScrollY }),
    [contentRef, registerSlot, unregisterSlot, subscribe, getActive, reportScrollY],
  );

  useEffect(() => {
    homeScrollLazyReporter = reportScrollY;
    return () => {
      homeScrollLazyReporter = null;
    };
  }, [reportScrollY]);

  return (
    <HomeScrollLazyContext.Provider value={value}>{children}</HomeScrollLazyContext.Provider>
  );
}

export function useHomeScrollLazyReporter(): ((y: number) => void) | null {
  return useContext(HomeScrollLazyContext)?.reportScrollY ?? null;
}

/** Scroll-position lazy slot for phone home — no measureInWindow polling. */
export function useHomeScrollLazySlot(sessionKey: string) {
  const ctx = useContext(HomeScrollLazyContext);
  const viewRef = useRef<View>(null);
  const estimatedHeight = estimateCatalogRailHeight();
  const activeRef = useRef(false);

  const subscribe = useCallback(
    (listener: () => void) => (ctx && sessionKey ? ctx.subscribe(sessionKey, listener) : () => {}),
    [ctx, sessionKey],
  );

  const getSnapshot = useCallback(() => {
    if (!ctx || !sessionKey) return true;
    return ctx.getActive(sessionKey);
  }, [ctx, sessionKey]);

  const active = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  activeRef.current = active;

  const measureSlot = useCallback(() => {
    if (!ctx || !sessionKey) return;
    const anchor = ctx.contentRef.current;
    const node = viewRef.current;
    if (!anchor || !node) return;

    const tryMeasure = (attempt: number) => {
      node.measureLayout(
        anchor,
        (_x, y, _width, height) => {
          const slotHeight = activeRef.current
            ? Math.max(height, 1)
            : estimatedHeight;
          ctx.registerSlot(sessionKey, { y, height: slotHeight });
        },
        () => {
          if (attempt < 8) {
            requestAnimationFrame(() => tryMeasure(attempt + 1));
            return;
          }
          // Last resort: treat as on-screen so the rail can fetch instead of staying empty.
          ctx.registerSlot(sessionKey, { y: 0, height: estimatedHeight });
        },
      );
    };

    tryMeasure(0);
  }, [ctx, sessionKey, estimatedHeight]);

  useEffect(() => {
    if (active) measureSlot();
  }, [active, measureSlot]);

  useEffect(() => {
    return () => {
      if (sessionKey) ctx?.unregisterSlot(sessionKey);
    };
  }, [ctx, sessionKey]);

  const onLayout = useCallback(
    (_event: LayoutChangeEvent) => {
      measureSlot();
    },
    [measureSlot],
  );

  return { active, onLayout, viewRef, estimatedHeight };
}

export function HomeScrollLazySlot({
  sessionKey,
  children,
}: {
  sessionKey: string;
  children: ReactNode;
}) {
  const { active, onLayout, viewRef, estimatedHeight } = useHomeScrollLazySlot(sessionKey);

  return (
    <View
      ref={viewRef}
      collapsable={false}
      onLayout={onLayout}
      style={active ? undefined : { minHeight: estimatedHeight }}
    >
      {active ? children : null}
    </View>
  );
}
