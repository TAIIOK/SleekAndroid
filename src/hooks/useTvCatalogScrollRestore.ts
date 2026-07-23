import { useCallback, useEffect, useRef } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

import {
  consumeCatalogScrollSnapshot,
  getCatalogActiveFocus,
  saveCatalogScrollSnapshot,
  setPendingCatalogFocusRestore,
} from '@/lib/tvCatalogScrollRestore';
import { isTvUi } from '@/lib/isTvUi';

/**
 * Save/restore vertical catalog scroll (+ remembered rail focus metadata) on Back.
 */
export function useTvCatalogScrollRestore(path: string) {
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollYRef = useRef(0);
  const restoredRef = useRef(false);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollYRef.current = event.nativeEvent.contentOffset.y;
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isTvUi()) return undefined;

      if (!restoredRef.current) {
        const snapshot = consumeCatalogScrollSnapshot(path);
        if (snapshot) {
          if (snapshot.railKey != null && snapshot.itemIndex != null) {
            setPendingCatalogFocusRestore(path, snapshot.railKey, snapshot.itemIndex);
          }
          if (scrollRef.current) {
            requestAnimationFrame(() => {
              scrollRef.current?.scrollTo({
                y: snapshot.scrollY,
                animated: false,
              });
            });
          }
        }
        restoredRef.current = true;
      }

      return () => {
        const focus = getCatalogActiveFocus(path);
        saveCatalogScrollSnapshot(path, {
          scrollY: scrollYRef.current,
          railKey: focus?.railKey,
          itemIndex: focus?.itemIndex,
        });
        restoredRef.current = false;
      };
    }, [path]),
  );

  // Also persist on unmount if focus effect cleanup was skipped.
  useEffect(() => {
    return () => {
      if (!isTvUi()) return;
      const focus = getCatalogActiveFocus(path);
      saveCatalogScrollSnapshot(path, {
        scrollY: scrollYRef.current,
        railKey: focus?.railKey,
        itemIndex: focus?.itemIndex,
      });
    };
  }, [path]);

  return { scrollRef, onScroll };
}
