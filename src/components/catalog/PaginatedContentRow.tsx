import type { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SectionHeader } from '@/components/ui/SectionHeader';
import { PosterSkeleton } from '@/components/ui/Skeleton';
import { colors, layout, spacing } from '@/constants/aniverse';

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
  layout?: 'rail' | 'grid' | 'showcase';
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
}: PaginatedContentRowProps<T>) {
  const horizontalPad = Platform.isTV ? layout.gutterDesktop : layout.gutterMobile;

  if (!isLoading && (isError || items.length === 0)) {
    return null;
  }

  return (
    <View style={styles.section}>
      {!hideTitle ? (
        <SectionHeader
          title={title}
          subtitle={subtitle}
          onSeeAll={onSeeAll}
          variant={onSeeAll ? 'rail-featured' : 'rail'}
          showAccent={Platform.isTV || Boolean(onSeeAll)}
        />
      ) : null}

      {isLoading && items.length === 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPad }]}
          {...(Platform.isTV
            ? ({
                snapToAlignment: 'start',
                snapToInterval: layout.posterWidthRail + 12,
                scrollAnimationEnabled: true,
              } as object)
            : {})}
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <PosterSkeleton key={index} />
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPad }]}
          {...(Platform.isTV
            ? ({
                snapToAlignment: 'start',
                snapToInterval: layout.posterWidthRail + 12,
                scrollAnimationEnabled: true,
              } as object)
            : {})}
          onScrollEndDrag={(event) => {
            if (!hasNextPage || isFetchingNextPage || !onLoadMore) return;
            const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
            if (contentOffset.x + layoutMeasurement.width >= contentSize.width - 120) {
              onLoadMore();
            }
          }}
        >
          {items.map((item, index) => (
            <View key={String(getItemKey(item, index))}>{renderItem(item, index)}</View>
          ))}
          {isFetchingNextPage ? <PosterSkeleton /> : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Platform.isTV ? spacing.lg : 32,
  },
  scroll: {
    paddingBottom: spacing.sm,
    gap: 12,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  error: {
    color: colors.danger,
  },
});
