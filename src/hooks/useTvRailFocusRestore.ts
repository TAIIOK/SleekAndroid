import { useCallback, useLayoutEffect, useRef, type RefCallback } from 'react';
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
};

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

  const register = useCallback((index: number, node: View | null) => {
    if (node) hostsRef.current.set(index, node as FocusHost);
    else hostsRef.current.delete(index);
  }, []);

  const onItemFocus = useCallback((index: number) => {
    ownsFocusRef.current = true;
    lastIndexRef.current = index;
    focusGenRef.current += 1;
  }, []);

  const onItemBlur = useCallback(() => {
    const gen = focusGenRef.current;
    queueMicrotask(() => {
      if (focusGenRef.current === gen) {
        ownsFocusRef.current = false;
      }
    });
  }, []);

  useLayoutEffect(() => {
    if (!isTvUi() || !ownsFocusRef.current) return;
    const host = hostsRef.current.get(lastIndexRef.current);
    host?.requestTVFocus?.();
  }, [itemCount]);

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

  return { bindItem };
}
