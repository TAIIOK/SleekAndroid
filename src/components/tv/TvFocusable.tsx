import { useRef, useState, type ReactNode } from 'react';
import {
  findNodeHandle,
  Pressable,
  StyleSheet,
  type StyleProp,
  type View,
  type ViewStyle,
} from 'react-native';

import { radii, tvFocus } from '@/constants/aniverse';
import { useTvShellFocus } from '@/providers/TvShellFocus';
import { useTvImmersiveFocusLock } from '@/lib/tvImmersiveFocus';
import { isTvUi } from '@/lib/isTvUi';
import { tvNextFocusLeft } from '@/lib/tvRailFocus';

interface TvFocusableProps {
  children: ReactNode;
  onPress?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  style?: StyleProp<ViewStyle>;
  focusedStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
  /** Prefer this control as the first focus target on TV screens. */
  hasTVPreferredFocus?: boolean;
  /** First item in a horizontal/vertical rail — Left jumps to the TV sidebar. */
  railStart?: boolean;
  /** Last item in a horizontal row — Right stays here (no 2D search into content below). */
  railEnd?: boolean;
  /** Top content entry — Up jumps to the TV sidebar. */
  contentEntry?: boolean;
  /** Access the underlying Pressable (e.g. `requestTVFocus` / `findNodeHandle`). */
  hostRef?: (node: View | null) => void;
  nextFocusDown?: number;
  nextFocusUp?: number;
  nextFocusLeft?: number;
  nextFocusRight?: number;
}

/** TV-friendly brand focus ring (lavender + wash). */
export function TvFocusable({
  children,
  onPress,
  onFocus,
  onBlur,
  style,
  focusedStyle,
  disabled,
  accessibilityLabel,
  hasTVPreferredFocus,
  railStart = false,
  railEnd = false,
  contentEntry = false,
  hostRef,
  nextFocusDown,
  nextFocusUp,
  nextFocusLeft,
  nextFocusRight,
}: TvFocusableProps) {
  const [focused, setFocused] = useState(false);
  const [selfTag, setSelfTag] = useState<number | undefined>();
  const shellFocus = useTvShellFocus();
  const immersiveLock = useTvImmersiveFocusLock();
  const pressableRef = useRef<View | null>(null);
  const canFocus = !disabled && !immersiveLock;
  const exitLeft = isTvUi() && railStart;
  const exitUp = isTvUi() && contentEntry;
  const pinnedLeft = tvNextFocusLeft({
    railStart: exitLeft,
    exitTag: shellFocus?.sidebarNativeTag,
    siblingTag: nextFocusLeft,
  });
  const pinnedRight = nextFocusRight ?? (isTvUi() && railEnd ? selfTag : undefined);

  const captureSelfTag = (node: View | null) => {
    if (!isTvUi() || !railEnd) return;
    const tag =
      node != null
        ? (findNodeHandle(node as Parameters<typeof findNodeHandle>[0]) ?? undefined)
        : undefined;
    setSelfTag((prev) => (prev === tag ? prev : tag));
  };

  return (
    <Pressable
      ref={(node) => {
        const view = node as unknown as View | null;
        pressableRef.current = view;
        hostRef?.(view);
        captureSelfTag(view);
      }}
      disabled={disabled}
      focusable={canFocus}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onFocus={() => {
        setFocused(true);
        // Return target for Right from the overlay menu.
        if (isTvUi() && pressableRef.current) {
          shellFocus?.registerContentAnchor(pressableRef.current);
          captureSelfTag(pressableRef.current);
        }
        if (exitLeft) shellFocus?.setExitLeftEnabled(true);
        if (exitUp) shellFocus?.setExitUpEnabled(true);
        onFocus?.();
      }}
      onBlur={() => {
        setFocused(false);
        if (exitLeft) shellFocus?.setExitLeftEnabled(false);
        if (exitUp) shellFocus?.setExitUpEnabled(false);
        onBlur?.();
      }}
      hasTVPreferredFocus={Boolean(hasTVPreferredFocus && canFocus && !shellFocus?.menuOpen)}
      // Pin Left to the sidebar so Android does not 2D-search across the page.
      {...(pinnedLeft != null ? { nextFocusLeft: pinnedLeft } : {})}
      {...(nextFocusDown != null ? { nextFocusDown } : {})}
      {...(nextFocusUp != null ? { nextFocusUp } : {})}
      {...(pinnedRight != null ? { nextFocusRight: pinnedRight } : {})}
      // Caller styles first; focused chrome must win (chips/options set their own border/bg).
      style={[styles.base, style, focused && styles.focused, focused && focusedStyle]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    borderWidth: tvFocus.borderWidth,
    borderColor: 'transparent',
  },
  focused: {
    borderColor: tvFocus.borderColor,
    backgroundColor: tvFocus.fill,
    borderWidth: tvFocus.borderWidth,
  },
});
