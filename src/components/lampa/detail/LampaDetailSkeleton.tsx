import { ScrollView, StyleSheet, View } from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, spacing } from '@/constants/aniverse';
import { isTvUi } from '@/lib/isTvUi';

export function LampaDetailSkeleton() {
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

        <Skeleton height={tv ? 28 : 22} width="65%" />
        <Skeleton height={14} width={80} />
        <Skeleton height={14} width="90%" />
        <Skeleton height={14} width="75%" />

        <View style={styles.actions}>
          <Skeleton height={44} width="58%" rounded={12} />
          <Skeleton height={44} width={44} rounded={12} />
          <Skeleton height={44} width={44} rounded={12} />
        </View>

        <Skeleton height={tv ? 180 : 140} rounded={20} />
        <Skeleton height={tv ? 160 : 120} rounded={20} />
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
    padding: isTvUi() ? spacing.xxl : spacing.md,
    // Match anime detail phone inset under the floating back button.
    paddingTop: isTvUi() ? spacing.xxl : spacing.md + 120,
    gap: isTvUi() ? spacing.md : spacing.sm,
    paddingBottom: spacing.xxl,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
