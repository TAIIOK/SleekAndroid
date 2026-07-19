import type { ReactNode } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { SectionHeader } from '@/components/ui/SectionHeader';
import { PosterSkeleton } from '@/components/ui/Skeleton';
import { colors, layout, spacing } from '@/constants/aniverse';
import { tvHorizontalCatalogScrollProps, tvRailSectionSnapProps } from '@/lib/tvCatalogScroll';

interface PaginatedContentRowProps<T> {
  title: string;
  subtitle?: string;
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  getItemKey: (item: T, index: number) => string | number;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
  onSeeAll?: () => void;
  hideTitle?: boolean;
  /** Nested in a padded parent — no extra horizontal gutter on title/rail. */
  flush?: boolean;
  layout?: 'rail' | 'grid' | 'showcase';
}

function maybeLoadMore(
  event: NativeSyntheticEvent<NativeScrollEvent>,
  hasNextPage?: boolean,
  isFetchingNextPage?: boolean,
  onLoadMore?: () => void,
) {
  if (!hasNextPage || isFetchingNextPage || !onLoadMore) return;
  const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
  if (contentOffset.x + layoutMeasurement.width >= contentSize.width - 120) {
    onLoadMore();
  }
}

export function PaginatedContentRow<T>({
  title,
  subtitle,
  items,
  renderItem,
  getItemKey,
  isLoading,
  isError,
  errorMessage,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onSeeAll,
  hideTitle,
  flush = false,
}: PaginatedContentRowProps<T>) {
  const horizontalPad = flush
    ? 0
    : Platform.isTV
      ? layout.gutterDesktop
      : layout.gutterMobile;
  const skeletonCount = Platform.isTV ? 4 : 6;

  if (!isLoading && (isError || items.length === 0)) {
    return null;
  }

  return (
    <View style={styles.section} {...tvRailSectionSnapProps}>
      {!hideTitle ? (
        <SectionHeader
          title={title}
          subtitle={subtitle}
          onSeeAll={onSeeAll}
          variant={onSeeAll ? 'rail-featured' : 'rail'}
          showAccent={Platform.isTV || Boolean(onSeeAll)}
          flush={flush}
        />
      ) : null}

      {isLoading && items.length === 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPad }]}
          {...tvHorizontalCatalogScrollProps}
        >
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <PosterSkeleton key={index} />
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPad }]}
          {...tvHorizontalCatalogScrollProps}
          onScrollEndDrag={(event) =>
            maybeLoadMore(event, hasNextPage, isFetchingNextPage, onLoadMore)
          }
          onMomentumScrollEnd={(event) =>
            maybeLoadMore(event, hasNextPage, isFetchingNextPage, onLoadMore)
          }
          // TV focus jumps fire onScroll (no momentum); keep this for D-pad load-more.
          onScroll={(event) => maybeLoadMore(event, hasNextPage, isFetchingNextPage, onLoadMore)}
          scrollEventThrottle={64}
        >
          {items.map((item, index) => (
            <View key={String(getItemKey(item, index))} collapsable={false}>
              {renderItem(item, index)}
            </View>
          ))}
          {isFetchingNextPage ? <PosterSkeleton /> : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Platform.isTV ? spacing.md : 32,
  },
  scroll: {
    // Extra vertical room so TV focus rings are not clipped by ScrollView.
    paddingTop: Platform.isTV ? 8 : 0,
    paddingBottom: Platform.isTV ? 10 : spacing.sm,
    gap: Platform.isTV ? 10 : 12,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  error: {
    color: colors.danger,
  },
});
