import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  Dimensions,
  type View,
} from 'react-native';
import { isTvUi } from '@/lib/isTvUi';

type UseNearViewportOptions = {
  /** Treat as visible immediately (skip gating). */
  eager?: boolean;
  /** Extra distance outside the viewport that still counts as near (px). */
  rootMargin?: number;
  /** Poll interval while inactive. */
  intervalMs?: number;
};

function defaultRootMargin(screenH: number): number {
  // TV: prefetch ~2 screens so the next D-pad rail is already mounting.
  return Math.round(screenH * (isTvUi() ? 2 : 1.25));
}

/**
 * Activates once the host view is within the window (+ prefetch margin).
 * Uses measureInWindow polling so nested ScrollView / TV focus scrolling works
 * without a shared scroll context.
 */
export function useNearViewport(options: UseNearViewportOptions = {}) {
  const { eager = false, rootMargin, intervalMs = isTvUi() ? 450 : 200 } = options;
  const ref = useRef<View>(null);
  const [active, setActive] = useState(eager);

  const check = useCallback(() => {
    if (active) return;
    const node = ref.current;
    if (!node) return;

    node.measureInWindow((_x, y, _width, height) => {
      const screenH = Dimensions.get('window').height;
      const margin = rootMargin ?? defaultRootMargin(screenH);
      const bottom = y + Math.max(height, 1);
      const near = bottom >= -margin && y <= screenH + margin;
      if (near) setActive(true);
    });
  }, [active, rootMargin]);

  useEffect(() => {
    if (eager) {
      setActive(true);
      return;
    }
    if (active) return;

    check();
    const id = setInterval(check, intervalMs);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [eager, active, check, intervalMs]);

  return { ref, active, onLayoutCheck: check };
}
