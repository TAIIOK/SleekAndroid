import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ViewProps } from 'react-native';

import { radii } from '@/constants/aniverse';

interface GlassSurfaceProps extends ViewProps {
  rounded?: 'md' | 'lg' | 'pill';
  padded?: boolean;
  className?: string;
}

export function GlassSurface({
  children,
  style,
  rounded = 'pill',
  padded = false,
  className,
  ...rest
}: GlassSurfaceProps) {
  const radius =
    rounded === 'pill' ? radii.pill : rounded === 'lg' ? radii.xl : radii.md;

  return (
    <View
      style={[
        styles.base,
        { borderRadius: radius },
        padded && styles.padded,
        Platform.OS === 'web' && styles.webBlur,
        style,
      ]}
      className={className}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  padded: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  webBlur: {
    // @ts-expect-error web-only
    backdropFilter: 'blur(40px) saturate(200%)',
    // @ts-expect-error web-only
    WebkitBackdropFilter: 'blur(40px) saturate(200%)',
  },
});
