import { useCallback, useMemo, useRef, useState } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

type ActiveGesture = 'volume' | 'scrub' | null;

export interface PhonePlayerGesturesOptions {
  enabled: boolean;
  locked: boolean;
  duration: number;
  currentTime: number;
  volume: number;
  skipBackwardSeconds: number;
  skipForwardSeconds: number;
  setVolume: (value: number) => void;
  seekTo: (time: number) => void;
  seekBy: (delta: number) => void;
  /** Current chrome visibility (read at tap time). */
  areControlsVisible: () => boolean;
  showControls: () => void;
  hideControls: () => void;
  /** When true, surface gestures are ignored (sheet open, etc.). */
  isSuppressed: () => boolean;
}

const DRAG_THRESHOLD_PX = 12;
const HUD_HIDE_MS = 700;
const DOUBLE_TAP_MS = 280;

/**
 * Phone surface gestures (site parity):
 * - tap (chrome hidden) → show immediately
 * - tap (chrome visible) → hide after double-tap window
 * - double-tap L/R → seek
 * - vertical drag (right third) → volume
 * - horizontal drag → scrub
 *
 * Tap is a real Gesture.Tap raced with Pan — Pan alone often fails
 * on stationary touches (especially Android), so chrome never appeared.
 */
export function usePhonePlayerGestures({
  enabled,
  locked,
  duration,
  currentTime,
  volume,
  skipBackwardSeconds,
  skipForwardSeconds,
  setVolume,
  seekTo,
  seekBy,
  areControlsVisible,
  showControls,
  hideControls,
  isSuppressed,
}: PhonePlayerGesturesOptions) {
  const activeGesture = useRef<ActiveGesture>(null);
  const pointerStart = useRef({ x: 0, y: 0, volume: 0, time: 0, width: 0, height: 0 });
  const scrubTimeRef = useRef(currentTime);
  const hideHudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);
  const layoutRef = useRef({ width: 1, height: 1 });

  const [hudKind, setHudKind] = useState<'volume' | null>(null);
  const [hudVolume, setHudVolume] = useState(volume);
  const [doubleTapHint, setDoubleTapHint] = useState<'backward' | 'forward' | null>(null);

  const clearHideHudTimer = useCallback(() => {
    if (hideHudTimerRef.current) {
      clearTimeout(hideHudTimerRef.current);
      hideHudTimerRef.current = null;
    }
  }, []);

  const dismissHud = useCallback(() => {
    clearHideHudTimer();
    activeGesture.current = null;
    setHudKind(null);
  }, [clearHideHudTimer]);

  const hideHudLater = useCallback(() => {
    clearHideHudTimer();
    hideHudTimerRef.current = setTimeout(() => {
      setHudKind(null);
      hideHudTimerRef.current = null;
    }, HUD_HIDE_MS);
  }, [clearHideHudTimer]);

  const showDoubleTap = useCallback((direction: 'backward' | 'forward') => {
    setDoubleTapHint(direction);
    setTimeout(() => setDoubleTapHint(null), 700);
  }, []);

  const toggleChrome = useCallback(() => {
    if (areControlsVisible()) {
      hideControls();
    } else {
      showControls();
    }
  }, [areControlsVisible, hideControls, showControls]);

  const handleTap = useCallback(
    (x: number) => {
      if (isSuppressed()) return;

      if (locked || !enabled) {
        toggleChrome();
        return;
      }

      const now = Date.now();
      const last = lastTapRef.current;
      const width = layoutRef.current.width;

      if (last && now - last.time < DOUBLE_TAP_MS) {
        lastTapRef.current = null;
        const isLeft = x < width / 2;
        if (isLeft) {
          seekBy(-skipBackwardSeconds);
          showDoubleTap('backward');
        } else {
          seekBy(skipForwardSeconds);
          showDoubleTap('forward');
        }
        return;
      }

      lastTapRef.current = { time: now, x };

      // Show immediately when chrome is hidden so the first tap always feels responsive.
      if (!areControlsVisible()) {
        showControls();
        return;
      }

      // When visible, wait for a possible double-tap before hiding.
      setTimeout(() => {
        if (!lastTapRef.current || lastTapRef.current.time !== now) return;
        lastTapRef.current = null;
        hideControls();
      }, DOUBLE_TAP_MS);
    },
    [
      areControlsVisible,
      enabled,
      hideControls,
      isSuppressed,
      locked,
      seekBy,
      showControls,
      showDoubleTap,
      skipBackwardSeconds,
      skipForwardSeconds,
      toggleChrome,
    ],
  );

  const onPanBegin = useCallback(
    (x: number, y: number) => {
      if (isSuppressed()) return;
      clearHideHudTimer();
      activeGesture.current = null;
      pointerStart.current = {
        x,
        y,
        volume,
        time: currentTime,
        width: layoutRef.current.width,
        height: layoutRef.current.height,
      };
    },
    [clearHideHudTimer, currentTime, isSuppressed, volume],
  );

  const onPanUpdate = useCallback(
    (x: number, y: number) => {
      if (isSuppressed() || !enabled || locked) return;

      const dx = x - pointerStart.current.x;
      const dy = y - pointerStart.current.y;
      const width = pointerStart.current.width;
      const height = pointerStart.current.height;
      const startX = pointerStart.current.x;
      const startY = pointerStart.current.y;

      // Ignore scrub/volume starts from the bottom chrome zone.
      if (startY > height * 0.68) return;

      if (!activeGesture.current) {
        if (startX > width * 0.7 && Math.abs(dy) > Math.abs(dx)) {
          activeGesture.current = 'volume';
        } else if (duration > 0 && Math.abs(dx) > Math.abs(dy)) {
          activeGesture.current = 'scrub';
        }
      }

      if (activeGesture.current === 'volume') {
        const delta = -(dy / Math.max(height, 1)) * 1.2;
        const next = Math.max(0, Math.min(1, pointerStart.current.volume + delta));
        setVolume(next);
        setHudVolume(next);
        setHudKind('volume');
        return;
      }

      if (activeGesture.current === 'scrub' && duration > 0) {
        const secondsPerPoint = (duration / Math.max(width, 1)) * 0.35;
        scrubTimeRef.current = Math.max(
          0,
          Math.min(duration, pointerStart.current.time + dx * secondsPerPoint),
        );
      }
    },
    [duration, enabled, isSuppressed, locked, setVolume],
  );

  const onPanEnd = useCallback(
    (x: number) => {
      if (isSuppressed()) {
        dismissHud();
        return;
      }

      if (activeGesture.current === 'scrub') {
        seekTo(scrubTimeRef.current);
        dismissHud();
      } else if (activeGesture.current === 'volume') {
        hideHudLater();
      } else {
        // Pan won the race (finger moved) but never became scrub/volume — still treat as tap.
        handleTap(x);
      }

      activeGesture.current = null;
    },
    [dismissHud, handleTap, hideHudLater, isSuppressed, seekTo],
  );

  const gesture = useMemo(() => {
    const tap = Gesture.Tap()
      .maxDistance(DRAG_THRESHOLD_PX)
      .onEnd((e) => {
        'worklet';
        runOnJS(handleTap)(e.x);
      });

    const pan = Gesture.Pan()
      .minDistance(DRAG_THRESHOLD_PX)
      .onBegin((e) => {
        'worklet';
        runOnJS(onPanBegin)(e.x, e.y);
      })
      .onUpdate((e) => {
        'worklet';
        runOnJS(onPanUpdate)(e.x, e.y);
      })
      .onEnd((e) => {
        'worklet';
        runOnJS(onPanEnd)(e.x);
      });

    // Tap must be a first-class gesture: Pan alone often fails on stationary touches.
    return Gesture.Race(tap, pan);
  }, [handleTap, onPanBegin, onPanEnd, onPanUpdate]);

  const onLayout = useCallback((width: number, height: number) => {
    layoutRef.current = { width: width || 1, height: height || 1 };
  }, []);

  return {
    gesture,
    hudKind,
    hudVolume,
    doubleTapHint,
    onLayout,
    dismissHud,
  };
}
