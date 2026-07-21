import {
  StyleSheet,
  View,
} from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { colors, spacing } from '@/constants/aniverse';
import { isTvUi } from '@/lib/isTvUi';

export function AnimeDetailSkeleton() {
  const tv = isTvUi();

  return (
    <View style={styles.root}>
      <Skeleton height={tv ? 260 : 240} rounded={16} />
      <View style={styles.stacked}>
        <View style={styles.main}>
          <Skeleton height={20} width={100} />
          <Skeleton height={14} style={{ marginTop: 10 }} />
          <Skeleton height={14} width={tv ? '70%' : 280} style={{ marginTop: 6 }} />
          <Skeleton height={14} width={tv ? '50%' : 220} style={{ marginTop: 6 }} />
          {tv ? (
            <View style={styles.epCol}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} height={72} rounded={12} />
              ))}
            </View>
          ) : (
            <View style={styles.epRow}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} width={136} height={100} rounded={12} />
              ))}
            </View>
          )}
        </View>
        <View style={styles.side}>
          <Skeleton height={180} rounded={20} />
          <Skeleton height={140} rounded={20} style={{ marginTop: 16 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: isTvUi() ? spacing.lg : spacing.md,
    gap: spacing.md,
  },
  stacked: {
    flexDirection: 'column',
    gap: spacing.md,
    alignItems: 'stretch',
  },
  main: { flex: 1, gap: spacing.sm },
  side: { width: '100%' },
  epRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  epCol: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
