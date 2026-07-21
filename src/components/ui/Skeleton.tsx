import { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type DimensionValue,
  type ViewStyle,
} from 'react-native';

import { colors, layout, radii } from '@/constants/aniverse';
import { isTvUi } from '@/lib/isTvUi';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  style?: ViewStyle;
  rounded?: number;
}

export function Skeleton({ width = '100%', height = 16, style, rounded = radii.md }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    if (isTvUi()) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 900, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  if (isTvUi()) {
    return (
      <View
        style={[
          styles.base,
          { width, height, borderRadius: rounded, opacity: 0.55 },
          style,
        ]}
      />
    );
  }

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius: rounded, opacity },
        style,
      ]}
    />
  );
}

export function PosterSkeleton({ width = layout.posterWidthRail }: { width?: number }) {
  const height = width / layout.posterAspect;
  return (
    <View style={{ width, marginRight: isTvUi() ? 10 : 12 }}>
      <Skeleton width={width} height={height} rounded={radii.md} />
      <Skeleton width={width * 0.85} height={12} style={{ marginTop: 8 }} rounded={6} />
      <Skeleton width={width * 0.55} height={10} style={{ marginTop: 6 }} rounded={6} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.bgCard,
  },
});
