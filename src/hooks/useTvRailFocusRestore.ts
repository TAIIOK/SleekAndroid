import { useCallback, useLayoutEffect, useRef, type RefCallback } from 'react';
import {
  type View,
} from 'react-native';
import { isTvUi } from '@/lib/isTvUi';
import { useTvEventHandlerSafe } from '@/lib/tvEventHandler';
import { railFocusStealIndex } from '@/lib/tvRailFocus';

type FocusHost = View & {
  requestTVFocus?: () => void;
};

export type TvRailFocusBind = {
  ref?: RefCallback<View>;
  onFocus?: () => void;
  onBlur?: () => void;
};

/** How long Up/Down stay pinned after a horizontal focus step (hold-Right guard). */
const VERTICAL_PIN_MS = 450;

/** Android moves focus on key-down; HW events arrive on key-up. */
const STEAL_BACK_MS = 320;

/**
 * Keeps D-pad focus on a horizontal rail after the row scrolls / appends pages.
 * Android TV often clears focus when the ScrollView jumps; we re-request the
 * last focused card while this rail still owns focus.
 *
 * Rapid Right/Left can 2D-search into another rail before JS updates nextFocus*.
 * If this rail owned focus and then lost it on a horizontal key, steal it back.
 *
 * Vertical pin is pushed to the focused card only (no rail-wide re-render).
 */
export function useTvRailFocusRestore(
  itemCount: number,
  options?: { stealHorizontalEscape?: boolean },
): {
  bindItem: (index: number) => TvRailFocusBind;
  ownsFocusRef: { current: boolean };
  subscribePin: (index: number, listener: (pinned: boolean) => void) => () => void;
} {
  const ownsFocusRef = useRef(false);
  const lastIndexRef = useRef(0);
  const focusGenRef = useRef(0);
  const hostsRef = useRef(new Map<number, FocusHost | null>());
  const prevCountRef = useRef(itemCount);
  const itemCountRef = useRef(itemCount);
  const lastOwnedAtRef = useRef(0);
  const pinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinnedIndexRef = useRef<number | null>(null);
  const pinListenersRef = useRef(new Map<number, (pinned: boolean) => void>());
  itemCountRef.current = itemCount;

  const stealHorizontalEscape = options?.stealHorizontalEscape === true;

  const setPinnedIndex = useCallback((next: number | null) => {
    const prev = pinnedIndexRef.current;
    if (prev === next) return;
    pinnedIndexRef.current = next;
    if (prev != null) pinListenersRef.current.get(prev)?.(false);
    if (next != null) pinListenersRef.current.get(next)?.(true);
  }, []);

  const clearPinTimer = () => {
    if (pinTimerRef.current != null) {
      clearTimeout(pinTimerRef.current);
      pinTimerRef.current = null;
    }
  };

  const armVerticalPin = useCallback(
    (index: number) => {
      clearPinTimer();
      setPinnedIndex(index);
      pinTimerRef.current = setTimeout(() => {
        setPinnedIndex(null);
        pinTimerRef.current = null;
      }, VERTICAL_PIN_MS);
    },
    [setPinnedIndex],
  );

  const register = useCallback((index: number, node: View | null) => {
    if (node) hostsRef.current.set(index, node as FocusHost);
    else hostsRef.current.delete(index);
  }, []);

  const onItemFocus = useCallback(
    (index: number) => {
      const prevIndex = lastIndexRef.current;
      const wasOwning = ownsFocusRef.current;
      ownsFocusRef.current = true;
      lastOwnedAtRef.current = Date.now();
      lastIndexRef.current = index;
      focusGenRef.current += 1;
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
  }, [setPinnedIndex]);

  const subscribePin = useCallback((index: number, listener: (pinned: boolean) => void) => {
    pinListenersRef.current.set(index, listener);
    listener(pinnedIndexRef.current === index);
    return () => {
      if (pinListenersRef.current.get(index) === listener) {
        pinListenersRef.current.delete(index);
      }
    };
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

  useTvEventHandlerSafe((event) => {
    if (!isTvUi() || !stealHorizontalEscape) return;
    if (event.eventKeyAction === 0) return;
    const direction: 1 | -1 | 0 =
      event.eventType === 'right' ? 1 : event.eventType === 'left' ? -1 : 0;
    if (direction === 0) return;

    const ownedAtEvent = ownsFocusRef.current;
    const recentlyOwned = Date.now() - lastOwnedAtRef.current < STEAL_BACK_MS;
    if (!ownedAtEvent && !recentlyOwned) return;

    const fromIndex = lastIndexRef.current;
    const stealIndex = railFocusStealIndex(fromIndex, direction, itemCountRef.current);
    if (stealIndex == null) return;

    requestAnimationFrame(() => {
      if (ownsFocusRef.current) return;
      hostsRef.current.get(stealIndex)?.requestTVFocus?.();
    });
  });

  const bindItem = useCallback(
    (index: number): TvRailFocusBind => {
      if (!isTvUi()) return {};
      return {
        ref: (node) => register(index, node),
        onFocus: () => onItemFocus(index),
        onBlur: onItemBlur,
      };
    },
    [register, onItemFocus, onItemBlur],
  );

  return { bindItem, ownsFocusRef, subscribePin };
}
