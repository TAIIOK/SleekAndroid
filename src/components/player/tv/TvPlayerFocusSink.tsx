import { useCallback, useEffect, useRef, useState } from 'react';
import { findNodeHandle, Pressable, StyleSheet, View, type View as ViewType } from 'react-native';

import type { TvHwEvent } from '@/lib/tvEventHandler';
import { tvKeyNativeEventToHw, type TvKeyNative } from '@/lib/tvKeyEvent';
import { isTvPlayerActivationKeyUp } from '@/lib/tvPlayerRemote';

type TvFocusHost = ViewType & { requestTVFocus?: () => void };

type TvKeyEvent = {
  nativeEvent: TvKeyNative;
  preventDefault?: () => void;
};

export type TvDpadRevealTags = {
  up?: number;
  down?: number;
  left?: number;
  right?: number;
};

const EMPTY_TAGS: TvDpadRevealTags = {};

function tagsEqual(a: TvDpadRevealTags, b: TvDpadRevealTags): boolean {
  return a.up === b.up && a.down === b.down && a.left === b.left && a.right === b.right;
}

type OverlayTrapTags = {
  downA?: number;
  downB?: number;
  upA?: number;
  upB?: number;
  left?: number;
  right?: number;
};

const EMPTY_TRAP: OverlayTrapTags = {};

function trapTagsEqual(a: OverlayTrapTags, b: OverlayTrapTags): boolean {
  return (
    a.downA === b.downA &&
    a.downB === b.downB &&
    a.upA === b.upA &&
    a.upB === b.upB &&
    a.left === b.left &&
    a.right === b.right
  );
}

type SeekTrapTags = {
  leftA?: number;
  leftB?: number;
  rightA?: number;
  rightB?: number;
};

const EMPTY_SEEK: SeekTrapTags = {};

function seekTagsEqual(a: SeekTrapTags, b: SeekTrapTags): boolean {
  return (
    a.leftA === b.leftA &&
    a.leftB === b.leftB &&
    a.rightA === b.rightA &&
    a.rightB === b.rightB
  );
}

/**
 * Hidden-chrome D-pad. Android TV consumes DPAD as focus search and never
 * delivers it to JS (OK still arrives as onPress). Put real focusable edges
 * around the sink and pin nextFocus* so Down/Up show the HUD and Left/Right
 * seek without chrome. ←/→ use ping-pong pads — bounce-to-sink ate the seek.
 * Overlay ↑/↓ also ping-pong (bounce-to-sink ate every other press).
 */
export function TvPlayerFocusSink({
  sinkActive = true,
  revealEdges = false,
  overlayTrap = false,
  onRevealTags,
  onTvKey,
}: {
  /** Center sink claims focus while the play dock is unmounted. */
  sinkActive?: boolean;
  /** Mount edge targets so D-pad has somewhere to go. */
  revealEdges?: boolean;
  /** Overlay open: ↑/↓ ping-pong pads step the list on every landing. */
  overlayTrap?: boolean;
  onRevealTags?: (tags: TvDpadRevealTags) => void;
  onTvKey?: (event: TvHwEvent) => void;
}) {
  const hostRef = useRef<TvFocusHost | null>(null);
  const focusedRef = useRef(false);
  const onTvKeyRef = useRef(onTvKey);
  onTvKeyRef.current = onTvKey;
  const onRevealTagsRef = useRef(onRevealTags);
  onRevealTagsRef.current = onRevealTags;
  const overlayTrapRef = useRef(overlayTrap);
  overlayTrapRef.current = overlayTrap;
  const revealEdgesRef = useRef(revealEdges);
  revealEdgesRef.current = revealEdges;
  const [tags, setTags] = useState<TvDpadRevealTags>(EMPTY_TAGS);
  const [trapTags, setTrapTags] = useState<OverlayTrapTags>(EMPTY_TRAP);
  const [seekTags, setSeekTags] = useState<SeekTrapTags>(EMPTY_SEEK);
  const [sinkTag, setSinkTag] = useState<number | undefined>();

  useEffect(() => {
    onRevealTagsRef.current?.(tags);
  }, [tags]);

  useEffect(() => {
    if (revealEdges) return;
    setTags((prev) => (tagsEqual(prev, EMPTY_TAGS) ? prev : EMPTY_TAGS));
  }, [revealEdges]);

  useEffect(() => {
    if (overlayTrap) return;
    setTrapTags((prev) => (trapTagsEqual(prev, EMPTY_TRAP) ? prev : EMPTY_TRAP));
  }, [overlayTrap]);

  useEffect(() => {
    if (revealEdges) return;
    setSeekTags((prev) => (seekTagsEqual(prev, EMPTY_SEEK) ? prev : EMPTY_SEEK));
  }, [revealEdges]);

  useEffect(() => {
    if (!sinkActive) {
      focusedRef.current = false;
      return;
    }
    const focus = () => hostRef.current?.requestTVFocus?.();
    focus();
    const frame = requestAnimationFrame(() => {
      focus();
      requestAnimationFrame(focus);
    });
    // Overlay / hidden seek pads: one claim only — later retries steal focus.
    const retries = (overlayTrap || revealEdges ? [80] : [80, 250, 600]).map((ms) =>
      setTimeout(focus, ms),
    );
    return () => {
      cancelAnimationFrame(frame);
      retries.forEach(clearTimeout);
    };
  }, [overlayTrap, revealEdges, sinkActive]);

  const emitNative = (native: TvKeyNative, action: 0 | 1, event?: TvKeyEvent) => {
    const hw = tvKeyNativeEventToHw(native, action);
    if (!hw) return;
    const arrow =
      hw.eventType === 'up' ||
      hw.eventType === 'down' ||
      hw.eventType === 'left' ||
      hw.eventType === 'right';
    // Overlay / hidden ←/→ must reach ping-pong pads (preventDefault + emit
    // would swallow the focus move and skip the seek).
    if (arrow && overlayTrapRef.current) return;
    if (
      revealEdgesRef.current &&
      (hw.eventType === 'left' || hw.eventType === 'right')
    ) {
      return;
    }
    event?.preventDefault?.();
    if (isTvPlayerActivationKeyUp(hw)) return;
    // DPAD_CENTER also fires Pressable onPress — emit select only there.
    if (hw.eventType === 'select') return;
    onTvKeyRef.current?.(hw);
  };

  const tvKeyProps = {
    onKeyDown: (event: TvKeyEvent) => emitNative(event.nativeEvent, 0, event),
    onKeyUp: (event: TvKeyEvent) => emitNative(event.nativeEvent, 1, event),
  };

  const bindEdge = useCallback((edge: keyof TvDpadRevealTags, node: ViewType | null) => {
    // Ignore null from callback-ref identity swaps — clearing tags re-renders forever.
    if (node == null) return;
    const next = findNodeHandle(node as Parameters<typeof findNodeHandle>[0]) ?? undefined;
    setTags((prev) => (prev[edge] === next ? prev : { ...prev, [edge]: next }));
  }, []);

  const bindTrap = useCallback((edge: keyof OverlayTrapTags, node: ViewType | null) => {
    if (node == null) return;
    const next = findNodeHandle(node as Parameters<typeof findNodeHandle>[0]) ?? undefined;
    setTrapTags((prev) => (prev[edge] === next ? prev : { ...prev, [edge]: next }));
  }, []);

  const bindSeek = useCallback((edge: keyof SeekTrapTags, node: ViewType | null) => {
    if (node == null) return;
    const next = findNodeHandle(node as Parameters<typeof findNodeHandle>[0]) ?? undefined;
    setSeekTags((prev) => (prev[edge] === next ? prev : { ...prev, [edge]: next }));
  }, []);

  const bindUp = useCallback((node: ViewType | null) => bindEdge('up', node), [bindEdge]);
  const bindDown = useCallback((node: ViewType | null) => bindEdge('down', node), [bindEdge]);
  const bindLeftA = useCallback((node: ViewType | null) => bindSeek('leftA', node), [bindSeek]);
  const bindLeftB = useCallback((node: ViewType | null) => bindSeek('leftB', node), [bindSeek]);
  const bindRightA = useCallback((node: ViewType | null) => bindSeek('rightA', node), [bindSeek]);
  const bindRightB = useCallback((node: ViewType | null) => bindSeek('rightB', node), [bindSeek]);
  const bindDownA = useCallback((node: ViewType | null) => bindTrap('downA', node), [bindTrap]);
  const bindDownB = useCallback((node: ViewType | null) => bindTrap('downB', node), [bindTrap]);
  const bindUpA = useCallback((node: ViewType | null) => bindTrap('upA', node), [bindTrap]);
  const bindUpB = useCallback((node: ViewType | null) => bindTrap('upB', node), [bindTrap]);
  const bindTrapLeft = useCallback((node: ViewType | null) => bindTrap('left', node), [bindTrap]);
  const bindTrapRight = useCallback((node: ViewType | null) => bindTrap('right', node), [bindTrap]);

  const onRevealFocus = (eventType: 'up' | 'down' | 'left' | 'right') => {
    onTvKeyRef.current?.({ eventType, eventKeyAction: 1 });
  };

  const onTrapStep = (eventType: 'up' | 'down' | 'left' | 'right') => {
    onTvKeyRef.current?.({ eventType, eventKeyAction: 1 });
    if (eventType === 'left' || eventType === 'right') {
      hostRef.current?.requestTVFocus?.();
    }
  };

  const onTrapSelect = () => {
    onTvKeyRef.current?.({ eventType: 'select', eventKeyAction: 0 });
  };

  const sinkNextFocus = overlayTrap
    ? {
        ...(trapTags.downA != null ? { nextFocusDown: trapTags.downA } : {}),
        ...(trapTags.upA != null ? { nextFocusUp: trapTags.upA } : {}),
        ...(trapTags.left != null ? { nextFocusLeft: trapTags.left } : {}),
        ...(trapTags.right != null ? { nextFocusRight: trapTags.right } : {}),
      }
    : {
        ...(tags.down != null ? { nextFocusDown: tags.down } : {}),
        ...(tags.up != null ? { nextFocusUp: tags.up } : {}),
        ...(seekTags.leftA != null ? { nextFocusLeft: seekTags.leftA } : {}),
        ...(seekTags.rightA != null ? { nextFocusRight: seekTags.rightA } : {}),
      };

  if (!sinkActive && !revealEdges && !overlayTrap) return null;

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      {sinkActive ? (
        <Pressable
          focusable
          hasTVPreferredFocus
          collapsable={false}
          android_ripple={{ color: 'transparent' }}
          style={styles.compact}
          {...sinkNextFocus}
          onFocus={() => {
            focusedRef.current = true;
          }}
          onBlur={() => {
            focusedRef.current = false;
          }}
          onPress={() => onTvKeyRef.current?.({ eventType: 'select', eventKeyAction: 0 })}
          {...(tvKeyProps as object)}
          ref={(node) => {
            hostRef.current = node as unknown as TvFocusHost | null;
            if (node == null) return;
            const next = findNodeHandle(node as Parameters<typeof findNodeHandle>[0]) ?? undefined;
            setSinkTag((prev) => (prev === next ? prev : next));
          }}
        />
      ) : null}

      {revealEdges ? (
        <>
          <Pressable
            focusable
            collapsable={false}
            style={styles.edgeUp}
            onFocus={() => onRevealFocus('up')}
            ref={bindUp}
          />
          <Pressable
            focusable
            collapsable={false}
            style={styles.edgeDown}
            onFocus={() => onRevealFocus('down')}
            ref={bindDown}
          />
          <Pressable
            focusable
            collapsable={false}
            style={styles.seekLeftA}
            onFocus={() => onRevealFocus('left')}
            ref={bindLeftA}
            {...(seekTags.leftB != null ? { nextFocusLeft: seekTags.leftB } : {})}
            {...(sinkTag != null ? { nextFocusRight: sinkTag } : {})}
            {...(tags.up != null ? { nextFocusUp: tags.up } : {})}
            {...(tags.down != null ? { nextFocusDown: tags.down } : {})}
          />
          <Pressable
            focusable
            collapsable={false}
            style={styles.seekLeftB}
            onFocus={() => onRevealFocus('left')}
            ref={bindLeftB}
            {...(seekTags.leftA != null ? { nextFocusLeft: seekTags.leftA } : {})}
            {...(sinkTag != null ? { nextFocusRight: sinkTag } : {})}
            {...(tags.up != null ? { nextFocusUp: tags.up } : {})}
            {...(tags.down != null ? { nextFocusDown: tags.down } : {})}
          />
          <Pressable
            focusable
            collapsable={false}
            style={styles.seekRightA}
            onFocus={() => onRevealFocus('right')}
            ref={bindRightA}
            {...(seekTags.rightB != null ? { nextFocusRight: seekTags.rightB } : {})}
            {...(sinkTag != null ? { nextFocusLeft: sinkTag } : {})}
            {...(tags.up != null ? { nextFocusUp: tags.up } : {})}
            {...(tags.down != null ? { nextFocusDown: tags.down } : {})}
          />
          <Pressable
            focusable
            collapsable={false}
            style={styles.seekRightB}
            onFocus={() => onRevealFocus('right')}
            ref={bindRightB}
            {...(seekTags.rightA != null ? { nextFocusRight: seekTags.rightA } : {})}
            {...(sinkTag != null ? { nextFocusLeft: sinkTag } : {})}
            {...(tags.up != null ? { nextFocusUp: tags.up } : {})}
            {...(tags.down != null ? { nextFocusDown: tags.down } : {})}
          />
        </>
      ) : null}

      {overlayTrap ? (
        <>
          <Pressable
            focusable
            collapsable={false}
            style={styles.trapDownA}
            onFocus={() => onTrapStep('down')}
            onPress={onTrapSelect}
            ref={bindDownA}
            {...(trapTags.downB != null ? { nextFocusDown: trapTags.downB } : {})}
            {...(trapTags.upA != null ? { nextFocusUp: trapTags.upA } : {})}
            {...(sinkTag != null ? { nextFocusLeft: sinkTag, nextFocusRight: sinkTag } : {})}
          />
          <Pressable
            focusable
            collapsable={false}
            style={styles.trapDownB}
            onFocus={() => onTrapStep('down')}
            onPress={onTrapSelect}
            ref={bindDownB}
            {...(trapTags.downA != null ? { nextFocusDown: trapTags.downA } : {})}
            {...(trapTags.upA != null ? { nextFocusUp: trapTags.upA } : {})}
            {...(sinkTag != null ? { nextFocusLeft: sinkTag, nextFocusRight: sinkTag } : {})}
          />
          <Pressable
            focusable
            collapsable={false}
            style={styles.trapUpA}
            onFocus={() => onTrapStep('up')}
            onPress={onTrapSelect}
            ref={bindUpA}
            {...(trapTags.upB != null ? { nextFocusUp: trapTags.upB } : {})}
            {...(trapTags.downA != null ? { nextFocusDown: trapTags.downA } : {})}
            {...(sinkTag != null ? { nextFocusLeft: sinkTag, nextFocusRight: sinkTag } : {})}
          />
          <Pressable
            focusable
            collapsable={false}
            style={styles.trapUpB}
            onFocus={() => onTrapStep('up')}
            onPress={onTrapSelect}
            ref={bindUpB}
            {...(trapTags.upA != null ? { nextFocusUp: trapTags.upA } : {})}
            {...(trapTags.downA != null ? { nextFocusDown: trapTags.downA } : {})}
            {...(sinkTag != null ? { nextFocusLeft: sinkTag, nextFocusRight: sinkTag } : {})}
          />
          <Pressable
            focusable
            collapsable={false}
            style={styles.edgeLeft}
            onFocus={() => onTrapStep('left')}
            onPress={onTrapSelect}
            ref={bindTrapLeft}
            {...(sinkTag != null
              ? {
                  nextFocusLeft: sinkTag,
                  nextFocusRight: sinkTag,
                  nextFocusUp: sinkTag,
                  nextFocusDown: sinkTag,
                }
              : {})}
          />
          <Pressable
            focusable
            collapsable={false}
            style={styles.edgeRight}
            onFocus={() => onTrapStep('right')}
            onPress={onTrapSelect}
            ref={bindTrapRight}
            {...(sinkTag != null
              ? {
                  nextFocusLeft: sinkTag,
                  nextFocusRight: sinkTag,
                  nextFocusUp: sinkTag,
                  nextFocusDown: sinkTag,
                }
              : {})}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
  },
  // ≥72 + slight opacity/bg: 1×1 / opacity-0 / transparent reject requestTVFocus.
  // No radius and near-zero opacity: Android TV's default focus highlight must
  // not linger as a circular pause-button ghost after the HUD hides.
  compact: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -36,
    width: 72,
    height: 72,
    opacity: 0.03,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 0,
  },
  edgeUp: {
    position: 'absolute',
    top: 0,
    left: 80,
    right: 80,
    height: 56,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  edgeDown: {
    position: 'absolute',
    bottom: 0,
    left: 80,
    right: 80,
    height: 72,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  trapDownA: {
    position: 'absolute',
    bottom: 0,
    left: 80,
    right: 80,
    height: 36,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  trapDownB: {
    position: 'absolute',
    bottom: 36,
    left: 80,
    right: 80,
    height: 36,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  trapUpA: {
    position: 'absolute',
    top: 0,
    left: 80,
    right: 80,
    height: 28,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  trapUpB: {
    position: 'absolute',
    top: 28,
    left: 80,
    right: 80,
    height: 28,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  edgeLeft: {
    position: 'absolute',
    top: 80,
    bottom: 80,
    left: 0,
    width: 56,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  edgeRight: {
    position: 'absolute',
    top: 80,
    bottom: 80,
    right: 0,
    width: 56,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  seekLeftA: {
    position: 'absolute',
    top: 80,
    bottom: 80,
    left: 0,
    width: 28,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  seekLeftB: {
    position: 'absolute',
    top: 80,
    bottom: 80,
    left: 28,
    width: 28,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  seekRightA: {
    position: 'absolute',
    top: 80,
    bottom: 80,
    right: 0,
    width: 28,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  seekRightB: {
    position: 'absolute',
    top: 80,
    bottom: 80,
    right: 28,
    width: 28,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
});
