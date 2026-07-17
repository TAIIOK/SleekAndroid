import { Platform, StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { colors, spacing } from '@/constants/aniverse';

export function LampaDetailSkeleton() {
  const wide = Platform.isTV;

  return (
    <View style={styles.root}>
      <Skeleton height={wide ? 420 : 320} rounded={24} />
      <View style={[styles.grid, !wide && styles.stacked]}>
        <View style={styles.main}>
          <Skeleton height={20} width={80} />
          <Skeleton height={14} style={{ marginTop: 12 }} />
          <Skeleton height={14} width={280} style={{ marginTop: 8 }} />
          <Skeleton height={14} width={220} style={{ marginTop: 8 }} />
        </View>
        <View style={styles.side}>
          <Skeleton height={220} rounded={20} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: Platform.isTV ? spacing.xxl : spacing.lg,
    gap: spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.xl,
    alignItems: 'flex-start',
  },
  stacked: { flexDirection: 'column' },
  main: { flex: 1 },
  side: { width: Platform.isTV ? 340 : '100%' },
});
