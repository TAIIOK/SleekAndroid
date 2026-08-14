import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { radii, spacing } from '@/constants/aniverse';

type FriendsListSkeletonProps = {
  rows?: number;
  variant?: 'row' | 'feed';
};

export function FriendsListSkeleton({ rows = 3, variant = 'row' }: FriendsListSkeletonProps) {
  return (
    <View style={styles.list}>
      {Array.from({ length: rows }, (_, index) =>
        variant === 'feed' ? (
          <View key={index} style={styles.feedRow}>
            <Skeleton width={36} height={36} rounded={18} />
            <View style={styles.feedText}>
              <Skeleton width="55%" height={14} />
              <Skeleton width="80%" height={14} />
            </View>
            <Skeleton width={48} height={72} rounded={radii.md} />
          </View>
        ) : (
          <View key={index} style={styles.row}>
            <Skeleton width={44} height={44} rounded={22} />
            <View style={styles.rowText}>
              <Skeleton width="45%" height={14} />
              <Skeleton width="28%" height={12} />
            </View>
          </View>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowText: { flex: 1, gap: 8 },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  feedText: { flex: 1, gap: 8 },
});
