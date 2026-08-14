import { useEffect, useRef, type ReactNode } from 'react';
import { Pressable, type StyleProp, type View, type ViewStyle } from 'react-native';

import type { TvHwEvent } from '@/lib/tvEventHandler';
import { tvKeyNativeEventToHw, type TvKeyNative } from '@/lib/tvKeyEvent';

type TvFocusHost = View & { requestTVFocus?: () => void };

type TvKeyEvent = {
  nativeEvent: TvKeyNative;
  preventDefault?: () => void;
};

/**
 * Native-focusable HUD control. Arrow keys move Android TV focus;
 * Back / playPause go to `onTvKey`. OK activates via `onPress` only
 * (keydown select + onPress would toggle play twice).
 * Pass `captureHorizontal` for the timeline so ←/→ seek without leaving
 * the bar; ↑/↓ still move native focus.
 */
export function TvHudPressable({
  style,
  hasTVPreferredFocus,
  captureArrows = false,
  captureHorizontal = false,
  captureVertical = false,
  nextFocusDown,
  nextFocusUp,
  nextFocusLeft,
  nextFocusRight,
  onTvKey,
  onPress,
  onFocus,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  hasTVPreferredFocus?: boolean;
  captureArrows?: boolean;
  captureHorizontal?: boolean;
  captureVertical?: boolean;
  nextFocusDown?: number;
  nextFocusUp?: number;
  nextFocusLeft?: number;
  nextFocusRight?: number;
  onTvKey: (event: TvHwEvent) => void;
  onPress: () => void;
  onFocus: () => void;
  children: ReactNode;
}) {
  const hostRef = useRef<TvFocusHost | null>(null);

  useEffect(() => {
    if (!hasTVPreferredFocus) return;
    const focus = () => hostRef.current?.requestTVFocus?.();
    focus();
    const frame = requestAnimationFrame(focus);
    const retry = setTimeout(focus, 80);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(retry);
    };
  }, [hasTVPreferredFocus]);

  const emit = (native: TvKeyNative, action: 0 | 1, event: TvKeyEvent) => {
    const hw = tvKeyNativeEventToHw(native, action);
    if (!hw) return;
    const arrow =
      hw.eventType === 'up' ||
      hw.eventType === 'down' ||
      hw.eventType === 'left' ||
      hw.eventType === 'right';
    if (arrow) {
      const horizontal = hw.eventType === 'left' || hw.eventType === 'right';
      if (horizontal && !captureArrows && !captureHorizontal) return;
      if (!horizontal && !captureArrows && !captureVertical) return;
    }
    event.preventDefault?.();
    // OK is Pressable onPress. Forwarding select here toggles play twice.
    if (hw.eventType === 'select') return;
    onTvKey(hw);
  };

  const tvKeyProps = {
    onKeyDown: (event: TvKeyEvent) => emit(event.nativeEvent, 0, event),
    onKeyUp: (event: TvKeyEvent) => emit(event.nativeEvent, 1, event),
  };

  return (
    <Pressable
      focusable
      hasTVPreferredFocus={hasTVPreferredFocus}
      collapsable={false}
      ref={(node) => {
        hostRef.current = node as unknown as TvFocusHost | null;
      }}
      onFocus={onFocus}
      onPress={onPress}
      style={style}
      {...(nextFocusDown != null ? { nextFocusDown } : {})}
      {...(nextFocusUp != null ? { nextFocusUp } : {})}
      {...(nextFocusLeft != null ? { nextFocusLeft } : {})}
      {...(nextFocusRight != null ? { nextFocusRight } : {})}
      {...(tvKeyProps as object)}
    >
      {children}
    </Pressable>
  );
}
