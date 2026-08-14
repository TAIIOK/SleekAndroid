import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, spacing } from '@/constants/aniverse';

/** Live viewing status over the party player (site PartySyncBadge parity). */
export function PartySyncBadge({
  connected,
  canControl,
  lastResyncAt,
  visible,
}: {
  connected: boolean;
  canControl: boolean;
  lastResyncAt?: number;
  visible?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [showResync, setShowResync] = useState(false);

  useEffect(() => {
    if (!lastResyncAt) return;
    setShowResync(true);
    const timer = setTimeout(() => setShowResync(false), 2400);
    return () => clearTimeout(timer);
  }, [lastResyncAt]);

  if (visible === false) return null;

  // Sit under the player title/back chrome so the chip never covers the name.
  const top = Math.max(insets.top, 12) + 52;

  return (
    <View style={[styles.wrap, { top }]} pointerEvents="none">
      <View style={styles.badge}>
        <View style={[styles.dot, connected ? styles.dotOn : styles.dotWarn]} />
        <Text style={styles.label}>
          {connected ? 'В прямом эфире' : 'Подключение…'}
        </Text>
        {!canControl ? (
          <>
            <Text style={styles.sep}>·</Text>
            <Text style={styles.meta}>у хоста</Text>
          </>
        ) : null}
        {canControl && connected ? (
          <>
            <Text style={styles.sep}>·</Text>
            <Text style={styles.meta}>ведущий</Text>
          </>
        ) : null}
      </View>
      {showResync ? (
        <View style={styles.resync}>
          <Text style={styles.resyncLabel}>Синхронизировано</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.md,
    zIndex: 40,
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotOn: { backgroundColor: '#34d399' },
  dotWarn: { backgroundColor: '#fbbf24' },
  label: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    includeFontPadding: false,
  },
  sep: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    lineHeight: 14,
    includeFontPadding: false,
  },
  meta: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    includeFontPadding: false,
  },
  resync: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  resyncLabel: {
    color: colors.brandTint,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    includeFontPadding: false,
  },
});
