import { useRef, useState, type ReactNode } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { SectionHeader } from '@/components/ui/SectionHeader';
import { PosterSkeleton } from '@/components/ui/Skeleton';
import { colors, layout, spacing } from '@/constants/aniverse';
import { tvHorizontalCatalogScrollProps, tvRailSectionSnapProps } from '@/lib/tvCatalogScroll';
import { resolveHeldTvRailWindow } from '@/lib/tvRailWindow';
import { isTvUi } from '@/lib/isTvUi';

interface PaginatedContentRowProps<T> {
  title: string;
  subtitle?: string;
  items: T[];
  renderItem: (
    item: T,
    index: number,
    focus?: { onFocused: () => void; verticalAnchor?: boolean },
  ) => ReactNode;
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
  /** Poster card width for phone FlatList layout math. */
  itemWidth?: number;
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

const RAIL_GAP = isTvUi() ? 10 : 12;

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
  itemWidth = layout.posterWidthRail,
}: PaginatedContentRowProps<T>) {
  const horizontalPad = flush
    ? 0
    : isTvUi()
      ? layout.gutterDesktop
      : layout.gutterMobile;
  const skeletonCount = isTvUi() ? 4 : 6;
  const stride = itemWidth + RAIL_GAP;
  const [focusedIndex, setFocusedIndex] = useState(0);
  const railWindowRef = useRef({ start: 0, end: 0 });
  const clampedFocus = items.length <= 0 ? 0 : Math.min(focusedIndex, items.length - 1);
  if (items.length === 0) railWindowRef.current = { start: 0, end: 0 };
  const railWindow = isTvUi()
    ? resolveHeldTvRailWindow(
        clampedFocus,
        items.length,
        railWindowRef.current.end === 0 ? null : railWindowRef.current,
      )
    : { start: 0, end: items.length };
  if (isTvUi()) railWindowRef.current = railWindow;

  const reportFocused = (index: number) => {
    setFocusedIndex(index);
  };

  const skeletonRow = (
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
  );

  const visibleItems = isTvUi()
    ? items.slice(railWindow.start, railWindow.end)
    : items;
  const leftSpacer = isTvUi() ? Math.max(0, railWindow.start) * stride : 0;
  const rightSpacer = isTvUi() ? Math.max(0, items.length - railWindow.end) * stride : 0;

  const tvRow = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.tvScroll, { paddingHorizontal: horizontalPad }]}
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
      {leftSpacer > 0 ? <View style={{ width: leftSpacer }} /> : null}
      {visibleItems.map((item, offset) => {
        const index = railWindow.start + offset;
        return (
          <View
            key={String(getItemKey(item, index))}
            collapsable={false}
            style={{ width: itemWidth, marginRight: RAIL_GAP }}
          >
            {renderItem(item, index, {
              onFocused: () => reportFocused(index),
              verticalAnchor: offset === 0,
            })}
          </View>
        );
      })}
      {rightSpacer > 0 ? <View style={{ width: rightSpacer }} /> : null}
      {isFetchingNextPage ? <PosterSkeleton /> : null}
    </ScrollView>
  );

  const renderPhoneItem = ({ item, index }: ListRenderItemInfo<T>) => (
    <View collapsable={false} style={{ width: itemWidth, marginRight: RAIL_GAP }}>
      {renderItem(item, index)}
    </View>
  );

  const phoneRow = (
    <FlatList
      horizontal
      data={items}
      keyExtractor={(item, index) => String(getItemKey(item, index))}
      renderItem={renderPhoneItem}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.phoneScroll, { paddingHorizontal: horizontalPad }]}
      initialNumToRender={6}
      maxToRenderPerBatch={4}
      windowSize={5}
      removeClippedSubviews
      nestedScrollEnabled
      getItemLayout={(_data, index) => ({
        length: stride,
        offset: stride * index,
        index,
      })}
      onEndReached={() => {
        if (!hasNextPage || isFetchingNextPage || !onLoadMore) return;
        onLoadMore();
      }}
      onEndReachedThreshold={0.4}
      ListFooterComponent={isFetchingNextPage ? <PosterSkeleton /> : null}
    />
  );

  return (
    <View style={styles.section} {...tvRailSectionSnapProps}>
      {!hideTitle ? (
        <SectionHeader
          title={title}
          subtitle={subtitle}
          onSeeAll={onSeeAll}
          variant={onSeeAll ? 'rail-featured' : 'rail'}
          showAccent={isTvUi() || Boolean(onSeeAll)}
          flush={flush}
        />
      ) : null}

      {isLoading && items.length === 0
        ? skeletonRow
        : isError && items.length === 0
          ? (
              <Text style={[styles.error, { paddingHorizontal: horizontalPad }]}>
                {errorMessage ?? 'Не удалось загрузить ленту'}
              </Text>
            )
          : isTvUi()
            ? tvRow
            : phoneRow}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: isTvUi() ? spacing.md : 32,
  },
  scroll: {
    // Extra vertical room so TV focus rings are not clipped by ScrollView.
    paddingTop: isTvUi() ? 8 : 0,
    paddingBottom: isTvUi() ? 10 : spacing.sm,
    gap: isTvUi() ? 10 : 12,
  },
  tvScroll: {
    paddingTop: 8,
    paddingBottom: 10,
  },
  phoneScroll: {
    paddingBottom: spacing.sm,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  error: {
    color: colors.danger,
  },
});
