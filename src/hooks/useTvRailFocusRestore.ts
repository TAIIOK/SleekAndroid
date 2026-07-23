import { useCallback, useLayoutEffect, useRef, useState, type RefCallback } from 'react';
import {
  type View,
} from 'react-native';
import { isTvUi } from '@/lib/isTvUi';

type FocusHost = View & {
  requestTVFocus?: () => void;
};

export type TvRailFocusBind = {
  ref?: RefCallback<View>;
  onFocus?: () => void;
  onBlur?: () => void;
  pinVerticalFocus?: boolean;
};

/** How long Up/Down stay pinned after a horizontal focus step (hold-Right guard). */
const VERTICAL_PIN_MS = 450;

/**
 * Keeps D-pad focus on a horizontal rail after the row scrolls / appends pages.
 * Android TV often clears focus when the ScrollView jumps; we re-request the
 * last focused card while this rail still owns focus.
 */
export function useTvRailFocusRestore(itemCount: number): {
  bindItem: (index: number) => TvRailFocusBind;
} {
  const ownsFocusRef = useRef(false);
  const lastIndexRef = useRef(0);
  const focusGenRef = useRef(0);
  const hostsRef = useRef(new Map<number, FocusHost | null>());
  const prevCountRef = useRef(itemCount);
  const pinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);

  const clearPinTimer = () => {
    if (pinTimerRef.current != null) {
      clearTimeout(pinTimerRef.current);
      pinTimerRef.current = null;
    }
  };

  const armVerticalPin = useCallback((index: number) => {
    clearPinTimer();
    setPinnedIndex(index);
    pinTimerRef.current = setTimeout(() => {
      setPinnedIndex(null);
      pinTimerRef.current = null;
    }, VERTICAL_PIN_MS);
  }, []);

  const register = useCallback((index: number, node: View | null) => {
    if (node) hostsRef.current.set(index, node as FocusHost);
    else hostsRef.current.delete(index);
  }, []);

  const onItemFocus = useCallback(
    (index: number) => {
      const prevIndex = lastIndexRef.current;
      const wasOwning = ownsFocusRef.current;
      ownsFocusRef.current = true;
      lastIndexRef.current = index;
      focusGenRef.current += 1;
      // Horizontal move within this rail — briefly block Up/Down escape.
      if (wasOwning && index !== prevIndex) {
        armVerticalPin(index);
      }
    },
    [armVerticalPin],
  );

  const onItemBlur = useCallback(() => {
    const gen = focusGenRef.current;
    queueMicrotask(() => {
      if (focusGenRef.current === gen) {
        ownsFocusRef.current = false;
        clearPinTimer();
        setPinnedIndex(null);
      }
    });
  }, []);

  useLayoutEffect(() => {
    const prevCount = prevCountRef.current;
    prevCountRef.current = itemCount;
    if (!isTvUi() || !ownsFocusRef.current) return;
    if (itemCount <= prevCount) return;
    const host = hostsRef.current.get(lastIndexRef.current);
    if (!host?.requestTVFocus) return;
    const timer = setTimeout(() => {
      if (!ownsFocusRef.current) return;
      hostsRef.current.get(lastIndexRef.current)?.requestTVFocus?.();
    }, 0);
    return () => clearTimeout(timer);
  }, [itemCount]);

  const bindItem = useCallback(
    (index: number): TvRailFocusBind => {
      if (!isTvUi()) return {};
      return {
        ref: (node) => register(index, node),
        onFocus: () => onItemFocus(index),
        onBlur: onItemBlur,
        pinVerticalFocus: pinnedIndex === index,
      };
    },
    [register, onItemFocus, onItemBlur, pinnedIndex],
  );

  return { bindItem };
}
