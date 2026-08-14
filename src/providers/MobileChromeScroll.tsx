import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import {
  StyleSheet,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { isTvUi } from '@/lib/isTvUi';

type ScrollHandler = (event: NativeSyntheticEvent<NativeScrollEvent>) => void;

type MobileChromeScrollContextValue = {
  scrollY: SharedValue<number>;
  hideDistance: SharedValue<number>;
  /** When true, scroll views must pad content for overlay top/bottom chrome. */
  contentInsetsEnabled: boolean;
  /** When true, top island stays fixed (hubs / profile chrome). */
  scrollPinned: boolean;
  scrollPinnedSv: SharedValue<number>;
  topContentInset: number;
  bottomContentInset: number;
  reportScrollY: (y: number) => void;
  reset: () => void;
  onScroll: ScrollHandler;
};

const MobileChromeScrollContext = createContext<MobileChromeScrollContextValue | null>(null);

export function MobileChromeScrollProvider({
  children,
  hideDistance,
  contentInsetsEnabled,
  scrollPinned = false,
  topContentInset,
  bottomContentInset,
}: {
  children: ReactNode;
  /** Distance (px) the top chrome travels before it is fully off-screen. */
  hideDistance: number;
  contentInsetsEnabled: boolean;
  /** Keep the top island fixed while the page scrolls. */
  scrollPinned?: boolean;
  topContentInset: number;
  bottomContentInset: number;
}) {
  const scrollY = useSharedValue(0);
  const hideDistanceSv = useSharedValue(hideDistance);
  const scrollPinnedSv = useSharedValue(scrollPinned ? 1 : 0);
  const pinnedRef = useRef(scrollPinned);
  const lastYRef = useRef(0);

  useEffect(() => {
    hideDistanceSv.value = hideDistance;
  }, [hideDistance, hideDistanceSv]);

  useEffect(() => {
    pinnedRef.current = scrollPinned;
    scrollPinnedSv.value = scrollPinned ? 1 : 0;
    if (scrollPinned) {
      lastYRef.current = 0;
      scrollY.value = 0;
    }
  }, [scrollPinned, scrollPinnedSv, scrollY]);

  const reportScrollY = useCallback(
    (y: number) => {
      if (pinnedRef.current) {
        if (scrollY.value !== 0) scrollY.value = 0;
        return;
      }
      const next = Math.max(0, y);
      lastYRef.current = next;
      scrollY.value = next;
    },
    [scrollY],
  );

  const reset = useCallback(() => {
    lastYRef.current = 0;
    scrollY.value = 0;
  }, [scrollY]);

  const onScroll = useCallback<ScrollHandler>(
    (event) => {
      reportScrollY(event.nativeEvent.contentOffset.y);
    },
    [reportScrollY],
  );

  const value = useMemo(
    () => ({
      scrollY,
      hideDistance: hideDistanceSv,
      contentInsetsEnabled,
      scrollPinned,
      scrollPinnedSv,
      topContentInset,
      bottomContentInset,
      reportScrollY,
      reset,
      onScroll,
    }),
    [
      scrollY,
      hideDistanceSv,
      contentInsetsEnabled,
      scrollPinned,
      scrollPinnedSv,
      topContentInset,
      bottomContentInset,
      reportScrollY,
      reset,
      onScroll,
    ],
  );

  return (
    <MobileChromeScrollContext.Provider value={value}>{children}</MobileChromeScrollContext.Provider>
  );
}

export function useMobileChromeScroll(): MobileChromeScrollContextValue | null {
  return useContext(MobileChromeScrollContext);
}

/** Animated style: top chrome slides up with scroll until fully hidden. */
export function useMobileChromeTopAnimatedStyle() {
  const ctx = useMobileChromeScroll();
  const scrollY = ctx?.scrollY;
  const hideDistance = ctx?.hideDistance;
  const scrollPinnedSv = ctx?.scrollPinnedSv;

  return useAnimatedStyle(() => {
    if (!scrollY || !hideDistance || (scrollPinnedSv?.value ?? 0) > 0) {
      return { transform: [{ translateY: 0 }], opacity: 1 };
    }
    const max = Math.max(hideDistance.value, 1);
    const offset = Math.min(Math.max(scrollY.value, 0), max);
    const progress = offset / max;
    return {
      transform: [{ translateY: -offset }],
      opacity: 1 - progress,
    };
  });
}

function mergeChromeContentPadding(
  contentContainerStyle: StyleProp<ViewStyle> | undefined,
  topInset: number,
  bottomInset: number,
): StyleProp<ViewStyle> {
  const flat = StyleSheet.flatten(contentContainerStyle) ?? {};
  const baseTop = typeof flat.paddingTop === 'number' ? flat.paddingTop : 0;
  const baseBottom = typeof flat.paddingBottom === 'number' ? flat.paddingBottom : 0;
  return {
    ...flat,
    paddingTop: baseTop + topInset,
    paddingBottom: baseBottom + bottomInset,
  };
}

/**
 * Phone-only scroll props for main vertical ScrollViews.
 * Merges overlay chrome padding into `contentContainerStyle` so content
 * scrolls under the floating top/bottom islands (no solid shell gutters).
 */
export function useMobileChromeScrollProps(
  existingOnScroll?: ScrollHandler,
  contentContainerStyle?: StyleProp<ViewStyle>,
  options?: { padTop?: boolean; padBottom?: boolean },
): {
  onScroll?: ScrollHandler;
  scrollEventThrottle?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
} {
  const ctx = useMobileChromeScroll();
  const padTop = options?.padTop !== false;
  const padBottom = options?.padBottom !== false;

  const onScroll = useCallback<ScrollHandler>(
    (event) => {
      existingOnScroll?.(event);
      if (isTvUi() || !ctx) return;
      ctx.reportScrollY(event.nativeEvent.contentOffset.y);
    },
    [ctx, existingOnScroll],
  );

  if (isTvUi() || !ctx) {
    return {
      ...(existingOnScroll ? { onScroll: existingOnScroll, scrollEventThrottle: 16 } : {}),
      ...(contentContainerStyle ? { contentContainerStyle } : {}),
    };
  }

  const topInset = ctx.contentInsetsEnabled && padTop ? ctx.topContentInset : 0;
  const bottomInset = ctx.contentInsetsEnabled && padBottom ? ctx.bottomContentInset : 0;

  const padded =
    topInset > 0 || bottomInset > 0
      ? mergeChromeContentPadding(contentContainerStyle, topInset, bottomInset)
      : contentContainerStyle;

  return {
    onScroll,
    scrollEventThrottle: 16,
    ...(padded ? { contentContainerStyle: padded } : {}),
  };
}

export { Animated as MobileChromeAnimated };
