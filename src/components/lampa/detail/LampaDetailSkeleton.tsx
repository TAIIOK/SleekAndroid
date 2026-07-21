import {
  StyleSheet,
  View,
} from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { colors, spacing } from '@/constants/aniverse';
import { isTvUi } from '@/lib/isTvUi';

export function LampaDetailSkeleton() {
  const wide = isTvUi();

  return (
    <View style={styles.root}>
      <Skeleton height={wide ? 260 : 240} rounded={16} />
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
    padding: isTvUi() ? spacing.xxl : spacing.md,
    gap: isTvUi() ? spacing.xl : spacing.md,
  },
  grid: {
    flexDirection: 'row',
    gap: isTvUi() ? spacing.xl : spacing.md,
    alignItems: 'flex-start',
  },
  stacked: { flexDirection: 'column' },
  main: { flex: 1 },
  side: { width: isTvUi() ? 280 : '100%' },
});
