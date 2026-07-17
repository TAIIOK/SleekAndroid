import { useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii } from '@/constants/aniverse';

interface TvFocusableProps {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  /** Prefer this control as the first focus target on TV screens. */
  hasTVPreferredFocus?: boolean;
}

/** TV-friendly focus ring without scale (site tv-focus-ring parity). */
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
    borderWidth: 2,
    borderColor: 'transparent',
  },
  focused: {
    borderColor: colors.brandTint,
    shadowColor: colors.focusGlow,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    ...(Platform.isTV ? {} : { backgroundColor: 'rgba(195,192,255,0.08)' }),
  },
});
