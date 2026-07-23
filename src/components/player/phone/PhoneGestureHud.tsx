import { StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { spacing } from '@/constants/aniverse';

export function PhoneGestureHud({
  kind,
  volume,
  brightness,
}: {
  kind: 'volume' | 'brightness' | null;
  volume: number;
  brightness: number;
}) {
  if (kind !== 'volume' && kind !== 'brightness') return null;

  const isBrightness = kind === 'brightness';
  const value = isBrightness ? brightness : volume;
  const percent = Math.round(value * 100);
  const fillWidth = `${percent}%` as DimensionValue;
  const icon = isBrightness
    ? percent < 35
      ? 'sunny-outline'
      : 'sunny'
    : percent === 0
      ? 'volume-mute'
      : 'volume-medium';

  return (
    <View style={[styles.wrap, isBrightness ? styles.wrapLeft : styles.wrapRight]} pointerEvents="none">
      <View style={styles.pill}>
        <Ionicons name={icon} size={18} color="#fff" />
        <View style={styles.track}>
          <View style={[styles.fill, { width: fillWidth }]} />
        </View>
        <Text style={styles.label}>{percent}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 72,
    zIndex: 35,
  },
  wrapLeft: {
    left: spacing.md,
  },
  wrapRight: {
    right: spacing.md,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  track: {
    width: 80,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#fff',
  },
  label: {
    minWidth: 40,
    color: '#fff',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
});
