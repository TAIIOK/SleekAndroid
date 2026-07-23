import { useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type View,
  type ViewStyle,
} from 'react-native';

import { radii, tvFocus } from '@/constants/aniverse';
import { useTvShellFocus } from '@/providers/TvShellFocus';
import { isTvUi } from '@/lib/isTvUi';

interface TvFocusableProps {
  children: ReactNode;
  onPress?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  style?: StyleProp<ViewStyle>;
  focusedStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
  /** Prefer this control as the first focus target on TV screens. */
  hasTVPreferredFocus?: boolean;
  /** First item in a horizontal/vertical rail — Left jumps to the TV sidebar. */
  railStart?: boolean;
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
  hasTVPreferredFocus,
  railStart = false,
  contentEntry = false,
  hostRef,
  nextFocusDown,
  nextFocusUp,
  nextFocusLeft,
  nextFocusRight,
}: TvFocusableProps) {
  const [focused, setFocused] = useState(false);
  const shellFocus = useTvShellFocus();
  const pressableRef = useRef<View | null>(null);
  const exitLeft = isTvUi() && railStart;
  const exitUp = isTvUi() && contentEntry;
  const sidebarTag = exitLeft ? shellFocus?.sidebarNativeTag : undefined;
  const pinnedLeft = nextFocusLeft ?? sidebarTag;

  return (
    <Pressable
      ref={(node) => {
        const view = node as unknown as View | null;
        pressableRef.current = view;
        hostRef?.(view);
      }}
      disabled={disabled}
      focusable={!disabled}
      onPress={onPress}
      onFocus={() => {
        setFocused(true);
        // Return target for Right from the overlay menu.
        if (isTvUi() && pressableRef.current) {
          shellFocus?.registerContentAnchor(pressableRef.current);
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
      hasTVPreferredFocus={hasTVPreferredFocus && !disabled}
      // Pin Left to the sidebar so Android does not 2D-search across the page.
      {...(pinnedLeft != null ? { nextFocusLeft: pinnedLeft } : {})}
      {...(nextFocusDown != null ? { nextFocusDown } : {})}
      {...(nextFocusUp != null ? { nextFocusUp } : {})}
      {...(nextFocusRight != null ? { nextFocusRight } : {})}
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
