import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { PosterSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { colors, layout, spacing, typography } from '@/constants/aniverse';
import { tvHorizontalCatalogScrollProps } from '@/lib/tvCatalogScroll';
import { isTvUi } from '@/lib/isTvUi';

function RailSkeleton() {
  const pad = isTvUi() ? layout.gutterDesktop : layout.gutterMobile;
  const count = isTvUi() ? 6 : 5;

  return (
    <View style={styles.rail}>
      <Skeleton
        width={isTvUi() ? 180 : 140}
        height={isTvUi() ? 22 : 20}
        style={styles.railTitle}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        focusable={false}
        contentContainerStyle={[styles.railScroll, { paddingHorizontal: pad }]}
        {...tvHorizontalCatalogScrollProps}
      >
        {Array.from({ length: count }).map((_, index) => (
          <PosterSkeleton key={index} />
        ))}
      </ScrollView>
    </View>
  );
}

interface CatalogBrowseSkeletonProps {
  title?: string;
}

/**
 * Stable placeholder while browse rails load.
 * Focus stays on the status row at the top — never on a poster (that scrolls the page).
 */
export function CatalogBrowseSkeleton({ title }: CatalogBrowseSkeletonProps) {
  const status = (
    <View style={styles.statusInner}>
      <ActivityIndicator color={colors.brand} size={isTvUi() ? 'large' : 'small'} />
      <Text style={styles.statusLabel}>Загрузка…</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      {title ? <Text style={styles.pageTitle}>{title}</Text> : null}

      {isTvUi() ? (
        <TvFocusable
          hasTVPreferredFocus
          style={styles.statusFocus}
          focusedStyle={styles.statusFocusFocused}
        >
          {status}
        </TvFocusable>
      ) : (
        <View style={styles.status}>{status}</View>
      )}

      <RailSkeleton />
      <RailSkeleton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    minHeight: isTvUi() ? 480 : 320,
  },
  pageTitle: {
    color: colors.text,
    ...typography.homeGroupTitle,
    paddingHorizontal: isTvUi() ? layout.gutterDesktop : layout.gutterMobile,
    marginBottom: spacing.md,
  },
  status: {
    paddingHorizontal: isTvUi() ? layout.gutterDesktop : layout.gutterMobile,
    marginBottom: spacing.lg,
  },
  statusInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusFocus: {
    alignSelf: 'flex-start',
    marginHorizontal: isTvUi() ? layout.gutterDesktop : layout.gutterMobile,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusFocusFocused: {
    borderColor: colors.brandTint,
    backgroundColor: 'rgba(195,192,255,0.12)',
  },
  statusLabel: {
    color: colors.textSecondary,
    fontSize: isTvUi() ? 16 : 14,
    fontWeight: '600',
  },
  rail: {
    marginBottom: spacing.md,
  },
  railTitle: {
    marginLeft: isTvUi() ? layout.gutterDesktop : layout.gutterMobile,
    marginBottom: spacing.sm,
  },
  railScroll: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});
