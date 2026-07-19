import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { PosterSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { colors, layout, spacing, typography } from '@/constants/aniverse';
import { tvHorizontalCatalogScrollProps } from '@/lib/tvCatalogScroll';

function RailSkeleton() {
  const pad = Platform.isTV ? layout.gutterDesktop : layout.gutterMobile;
  const count = Platform.isTV ? 6 : 5;

  return (
    <View style={styles.rail}>
      <Skeleton
        width={Platform.isTV ? 180 : 140}
        height={Platform.isTV ? 22 : 20}
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
      <ActivityIndicator color={colors.brand} size={Platform.isTV ? 'large' : 'small'} />
      <Text style={styles.statusLabel}>Загрузка…</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      {title ? <Text style={styles.pageTitle}>{title}</Text> : null}

      {Platform.isTV ? (
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
    minHeight: Platform.isTV ? 480 : 320,
  },
  pageTitle: {
    color: colors.text,
    ...typography.homeGroupTitle,
    paddingHorizontal: Platform.isTV ? layout.gutterDesktop : layout.gutterMobile,
    marginBottom: spacing.md,
  },
  status: {
    paddingHorizontal: Platform.isTV ? layout.gutterDesktop : layout.gutterMobile,
    marginBottom: spacing.lg,
  },
  statusInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusFocus: {
    alignSelf: 'flex-start',
    marginHorizontal: Platform.isTV ? layout.gutterDesktop : layout.gutterMobile,
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
    fontSize: Platform.isTV ? 16 : 14,
    fontWeight: '600',
  },
  rail: {
    marginBottom: spacing.md,
  },
  railTitle: {
    marginLeft: Platform.isTV ? layout.gutterDesktop : layout.gutterMobile,
    marginBottom: spacing.sm,
  },
  railScroll: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});
