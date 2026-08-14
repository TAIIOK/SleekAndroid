import { useCallback, useEffect, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';

import {
  consumeCatalogScrollSnapshot,
  getCatalogActiveFocus,
  peekCatalogScrollSnapshot,
  saveCatalogScrollSnapshot,
  setPendingCatalogFocusRestore,
  takeCatalogFreshLanding,
} from '@/lib/tvCatalogScrollRestore';
import { isTvUi } from '@/lib/isTvUi';
import { notifyViewportScroll } from '@/lib/viewportScroll';
import { notifyHomeScrollLazy } from '@/providers/HomeScrollLazy';

type UseTvCatalogScrollRestoreOptions = {
  /** When false, skip restore until the catalog body is ready to mount. */
  enabled?: boolean;
};

/**
 * Save/restore vertical catalog scroll (+ remembered rail focus metadata) on Back.
 */
export function useTvCatalogScrollRestore(
  path: string,
  options: UseTvCatalogScrollRestoreOptions = {},
) {
  const { enabled = true } = options;
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollYRef = useRef(0);
  const restoredRef = useRef(false);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollYRef.current = event.nativeEvent.contentOffset.y;
    if (isTvUi()) notifyViewportScroll(scrollYRef.current);
  }, []);

  const applyScrollRestore = useCallback((scrollY: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ y: scrollY, animated: false });
    }
    scrollYRef.current = scrollY;
    if (!isTvUi()) {
      // Activate lazy rails after the frame so replace→home is not blocked by a mount storm.
      notifyHomeScrollLazy(scrollY);
      return;
    }
    notifyViewportScroll(scrollY);
  }, []);

  const restoreScroll = useCallback(() => {
    const snapshot = isTvUi()
      ? consumeCatalogScrollSnapshot(path)
      : peekCatalogScrollSnapshot(path);
    if (!snapshot) {
      if (!isTvUi()) {
        notifyHomeScrollLazy(scrollYRef.current);
        return undefined;
      }
      if (takeCatalogFreshLanding(path)) {
        requestAnimationFrame(() => applyScrollRestore(0));
      }
      return undefined;
    }

    if (isTvUi()) {
      if (snapshot.railKey != null && snapshot.itemIndex != null) {
        setPendingCatalogFocusRestore(path, snapshot.railKey, snapshot.itemIndex);
      }
      requestAnimationFrame(() => applyScrollRestore(snapshot.scrollY));
      return undefined;
    }

    // Do NOT use InteractionManager — it can hang across stack transitions and
    // looks like a lock that prevents Home from becoming interactive.
    const timer = setTimeout(() => {
      requestAnimationFrame(() => applyScrollRestore(snapshot.scrollY));
    }, 0);
    return () => clearTimeout(timer);
  }, [applyScrollRestore, path]);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return undefined;

      let cancelRestore: (() => void) | undefined;
      if (!restoredRef.current) {
        cancelRestore = restoreScroll();
        restoredRef.current = true;
      }

      return () => {
        cancelRestore?.();
        saveCatalogScrollSnapshot(path, {
          scrollY: scrollYRef.current,
          ...(isTvUi()
            ? {
                railKey: getCatalogActiveFocus(path)?.railKey,
                itemIndex: getCatalogActiveFocus(path)?.itemIndex,
              }
            : {}),
        });
        restoredRef.current = false;
      };
    }, [enabled, path, restoreScroll]),
  );

  // Also persist on unmount if focus effect cleanup was skipped.
  useEffect(() => {
    return () => {
      saveCatalogScrollSnapshot(path, {
        scrollY: scrollYRef.current,
        ...(isTvUi()
          ? {
              railKey: getCatalogActiveFocus(path)?.railKey,
              itemIndex: getCatalogActiveFocus(path)?.itemIndex,
            }
          : {}),
      });
    };
  }, [path]);

  return { scrollRef, onScroll };
}
