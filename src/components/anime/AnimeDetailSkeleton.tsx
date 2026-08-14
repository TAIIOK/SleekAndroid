import { ScrollView, StyleSheet, View } from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, spacing } from '@/constants/aniverse';
import { isTvUi } from '@/lib/isTvUi';

export function AnimeDetailSkeleton() {
  const tv = isTvUi();

  return (
    <View style={styles.root}>
      {tv ? (
        <TvFocusable
          hasTVPreferredFocus
          railStart
          contentEntry
          accessibilityLabel="Загрузка"
          style={styles.focusTrap}
        >
          <View />
        </TvFocusable>
      ) : null}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        scrollEnabled={false}
        pointerEvents="none"
      >
        <Skeleton height={tv ? 260 : 240} rounded={16} />

        <Skeleton height={tv ? 28 : 22} width="70%" />
        <Skeleton height={tv ? 14 : 12} width="45%" />
        <Skeleton height={tv ? 14 : 12} width="90%" />
        <Skeleton height={tv ? 14 : 12} width="80%" />

        <View style={styles.actions}>
          <Skeleton height={44} width="58%" rounded={12} />
          <Skeleton height={44} width={44} rounded={12} />
          <Skeleton height={44} width={44} rounded={12} />
        </View>

        {tv ? (
          <View style={styles.epCol}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height={72} rounded={12} />
            ))}
          </View>
        ) : (
          <View style={styles.epRow}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} width={112} height={84} rounded={10} />
            ))}
          </View>
        )}

        <Skeleton height={tv ? 160 : 120} rounded={tv ? 20 : 12} />
        <Skeleton height={tv ? 140 : 100} rounded={tv ? 20 : 12} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  focusTrap: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  content: {
    padding: isTvUi() ? spacing.lg : spacing.md,
    // Clear floating back button / status bar on phone (same as hero leftCol).
    paddingTop: isTvUi() ? spacing.lg : spacing.md + 120,
    gap: isTvUi() ? spacing.md : spacing.sm,
    paddingBottom: spacing.xxl,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  epRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.xs,
  },
  epCol: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
