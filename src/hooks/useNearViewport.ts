import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  AppState,
  Dimensions,
  type View,
} from 'react-native';
import { isTvUi } from '@/lib/isTvUi';
import {
  defaultKeepMargin,
  defaultPrefetchMargin,
  isRailNearViewport,
  isSlotClearlyFarFromViewport,
} from '@/lib/nearViewport';
import { getViewportScrollY, subscribeViewportScroll } from '@/lib/viewportScroll';

type SlotLayout = { y: number; height: number };

type UseNearViewportOptions = {
  /** Start active (skip the first placeholder frame). Still polls when deactivateWhenFar. */
  eager?: boolean;
  /** Extra distance below the viewport that still counts as near (px). */
  rootMargin?: number;
  /** Extra distance above the viewport that still keeps an active rail (px). */
  keepMargin?: number;
  /** Poll interval while inactive. */
  intervalMs?: number;
  /** Unmount content when the slot leaves the keep band. */
  deactivateWhenFar?: boolean;
  /** Re-check visibility when the screen regains focus (detail → Back). */
  recheckOnFocus?: boolean;
};

const ACTIVE_SLACK_PX = 48;

type CheckOptions = {
  /** Native focus-scroll / layout / focus: do not trust stale scrollY to skip measure. */
  forceMeasure?: boolean;
};

/**
 * Activates once the host view is within the window (+ prefetch margin).
 * Polls only while the screen is focused. Scroll notifications may skip
 * measureInWindow for slots clearly outside the band; interval/layout always measure
 * so D-pad native scrolling still mounts the next anime/catalog rail.
 */
export function useNearViewport(options: UseNearViewportOptions = {}) {
  const {
    eager = false,
    rootMargin,
    keepMargin,
    intervalMs = isTvUi() ? 450 : 200,
    deactivateWhenFar = false,
    recheckOnFocus = false,
  } = options;
  const ref = useRef<View>(null);
  const layoutRef = useRef<SlotLayout | null>(null);
  // True until blur — deferred rails mount while the hub is already focused.
  const focusedRef = useRef(true);
  const [active, setActive] = useState(eager);
  const activeRef = useRef(active);
  activeRef.current = active;

  const check = useCallback((opts: CheckOptions = {}) => {
    if (!focusedRef.current) return;
    if (!deactivateWhenFar && activeRef.current) return;

    const screenH = Dimensions.get('window').height;
    const isTv = isTvUi();
    const prefetch = rootMargin ?? defaultPrefetchMargin(screenH, isTv);
    const keep = keepMargin ?? defaultKeepMargin(screenH, isTv);
    const slack = activeRef.current ? ACTIVE_SLACK_PX : 0;
    const layout = layoutRef.current;
    const scrollY = getViewportScrollY();

    if (layout) {
      const estimatedY = layout.y - scrollY;
      const estimatedNear = isRailNearViewport(
        estimatedY,
        layout.height,
        screenH,
        prefetch,
        keep,
        slack,
      );
      if (estimatedNear && !activeRef.current) {
        setActive(true);
      }
      if (
        !opts.forceMeasure &&
        isSlotClearlyFarFromViewport(
          layout.y,
          layout.height,
          scrollY,
          screenH,
          prefetch,
          keep,
        )
      ) {
        if (deactivateWhenFar && activeRef.current) setActive(false);
        return;
      }
    }

    const node = ref.current;
    if (!node) return;

    node.measureInWindow((_x, y, _width, height) => {
      const near = isRailNearViewport(y, height, screenH, prefetch, keep, slack);
      if (near) {
        if (!activeRef.current) setActive(true);
        return;
      }
      if (deactivateWhenFar && activeRef.current) {
        setActive(false);
      }
    });
  }, [rootMargin, keepMargin, deactivateWhenFar]);

  const onLayoutCheck = useCallback(
    (layout?: SlotLayout) => {
      if (layout) layoutRef.current = layout;
      check({ forceMeasure: true });
    },
    [check],
  );

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      if (eager) setActive(true);
      check({ forceMeasure: true });
      return () => {
        focusedRef.current = false;
      };
    }, [check, eager]),
  );

  useEffect(() => {
    if (eager) setActive(true);
    check({ forceMeasure: true });

    const shouldWatch = deactivateWhenFar || !eager || recheckOnFocus;
    if (!shouldWatch) return undefined;

    const id = setInterval(() => {
      if (focusedRef.current) check({ forceMeasure: true });
    }, intervalMs);
    const unsubScroll = subscribeViewportScroll(() => {
      if (focusedRef.current) check();
    });
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check({ forceMeasure: true });
    });
    return () => {
      clearInterval(id);
      unsubScroll();
      sub.remove();
    };
  }, [eager, deactivateWhenFar, recheckOnFocus, check, intervalMs]);

  return { ref, active, onLayoutCheck };
}
