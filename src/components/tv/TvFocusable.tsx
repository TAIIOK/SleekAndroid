import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { radii, tvFocus } from '@/constants/aniverse';

interface TvFocusableProps {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  /** Prefer this control as the first focus target on TV screens. */
  hasTVPreferredFocus?: boolean;
}

/** TV-friendly brand focus ring (lavender + soft glow). */
export function TvFocusable({
  children,
  onPress,
  style,
  disabled,
  hasTVPreferredFocus,
}: TvFocusableProps) {
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={[styles.base, focused && styles.focused, style]}
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
    ...tvFocus.glow,
  },
});
