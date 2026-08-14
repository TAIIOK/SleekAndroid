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

/**
 * Hidden-chrome D-pad. Android TV consumes DPAD_DOWN as focus search and never
 * delivers it to JS (OK still arrives as onPress). Put real focusable edges
 * around the sink and pin nextFocus* so Down/Up/Left/Right land on a target
 * whose onFocus shows the HUD.
 */
export function TvPlayerFocusSink({
  sinkActive = true,
  revealEdges = false,
  onRevealTags,
  onTvKey,
}: {
  /** Center sink claims focus while the play dock is unmounted. */
  sinkActive?: boolean;
  /** Mount edge targets so D-pad has somewhere to go. */
  revealEdges?: boolean;
  onRevealTags?: (tags: TvDpadRevealTags) => void;
  onTvKey?: (event: TvHwEvent) => void;
}) {
  const hostRef = useRef<TvFocusHost | null>(null);
  const focusedRef = useRef(false);
  const onTvKeyRef = useRef(onTvKey);
  onTvKeyRef.current = onTvKey;
  const onRevealTagsRef = useRef(onRevealTags);
  onRevealTagsRef.current = onRevealTags;
  const [tags, setTags] = useState<TvDpadRevealTags>(EMPTY_TAGS);

  useEffect(() => {
    onRevealTagsRef.current?.(tags);
  }, [tags]);

  useEffect(() => {
    if (revealEdges) return;
    setTags((prev) => (tagsEqual(prev, EMPTY_TAGS) ? prev : EMPTY_TAGS));
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
    const retries = [80, 250, 600].map((ms) => setTimeout(focus, ms));
    return () => {
      cancelAnimationFrame(frame);
      retries.forEach(clearTimeout);
    };
  }, [sinkActive]);

  const emitNative = (native: TvKeyNative, action: 0 | 1, event?: TvKeyEvent) => {
    const hw = tvKeyNativeEventToHw(native, action);
    if (!hw) return;
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

  const bindUp = useCallback((node: ViewType | null) => bindEdge('up', node), [bindEdge]);
  const bindDown = useCallback((node: ViewType | null) => bindEdge('down', node), [bindEdge]);
  const bindLeft = useCallback((node: ViewType | null) => bindEdge('left', node), [bindEdge]);
  const bindRight = useCallback((node: ViewType | null) => bindEdge('right', node), [bindEdge]);

  const reveal = (eventType: 'up' | 'down' | 'left' | 'right') => {
    onTvKeyRef.current?.({ eventType, eventKeyAction: 1 });
  };

  if (!sinkActive && !revealEdges) return null;

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      {sinkActive ? (
        <Pressable
          focusable
          hasTVPreferredFocus
          collapsable={false}
          style={styles.compact}
          {...(tags.down != null ? { nextFocusDown: tags.down } : {})}
          {...(tags.up != null ? { nextFocusUp: tags.up } : {})}
          {...(tags.left != null ? { nextFocusLeft: tags.left } : {})}
          {...(tags.right != null ? { nextFocusRight: tags.right } : {})}
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
          }}
        />
      ) : null}

      {revealEdges ? (
        <>
          <Pressable
            focusable
            collapsable={false}
            style={styles.edgeUp}
            onFocus={() => reveal('up')}
            ref={bindUp}
          />
          <Pressable
            focusable
            collapsable={false}
            style={styles.edgeDown}
            onFocus={() => reveal('down')}
            ref={bindDown}
          />
          <Pressable
            focusable
            collapsable={false}
            style={styles.edgeLeft}
            onFocus={() => reveal('left')}
            ref={bindLeft}
          />
          <Pressable
            focusable
            collapsable={false}
            style={styles.edgeRight}
            onFocus={() => reveal('right')}
            ref={bindRight}
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
  compact: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -36,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.04)',
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
});
