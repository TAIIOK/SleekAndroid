import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { CatalogPosterCard } from '@/components/catalog/CatalogPosterCard';
import { PosterGrid, usePosterGridCardWidth } from '@/components/catalog/PosterGrid';
import { colors, layout, spacing } from '@/constants/aniverse';
import { usePosterGridLayout } from '@/hooks/usePosterGridLayout';
import { useTvHomeFeedSource } from '@/hooks/useTvHomeFeedSource';
import type { CatalogHomeConfig } from '@/lib/homeSettings';
import { registerTvHomeCatalogFocus } from '@/lib/tvHomeFocusHandoff';
import type { TvHomeFeedSource } from '@/lib/tvHomeFeeds';
import { resolveHeldTvGridWindow } from '@/lib/tvRailWindow';

interface TvHomeFeedGridProps {
  source: TvHomeFeedSource;
  config: CatalogHomeConfig;
  /** Prefer first poster when Continue Watching is empty and tabs are not the entry. */
  contentEntry?: boolean;
}

export function TvHomeFeedGrid({
  source,
  config,
  contentEntry = false,
}: TvHomeFeedGridProps) {
  const {
    items,
    isLoading,
    isError,
    errorMessage,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    openItem,
  } = useTvHomeFeedSource(source, config);
  const cardWidth = usePosterGridCardWidth();
  const { columns, gap } = usePosterGridLayout();
  const [focusedIndex, setFocusedIndex] = useState(0);
  const gridWindowRef = useRef({ start: 0, end: 0 });
  const clampedFocus = items.length <= 0 ? 0 : Math.min(focusedIndex, items.length - 1);
  if (items.length === 0) gridWindowRef.current = { start: 0, end: 0 };
  const gridWindow = resolveHeldTvGridWindow(
    clampedFocus,
    items.length,
    columns,
    gridWindowRef.current.end === 0 ? null : gridWindowRef.current,
  );
  gridWindowRef.current = gridWindow;

  if (isLoading && !items.length) {
    return <ActivityIndicator color={colors.brand} style={styles.loader} />;
  }

  if (isError && !items.length) {
    return <Text style={styles.empty}>{errorMessage ?? 'Не удалось загрузить ленту'}</Text>;
  }

  if (!items.length) {
    return <Text style={styles.empty}>В этой ленте пока ничего нет</Text>;
  }

  const cardHeight = Math.round(cardWidth / layout.posterAspect);
  const rowStride = cardHeight + gap;
  const topSpacer = Math.floor(gridWindow.start / columns) * rowStride;
  const bottomRows = Math.max(0, Math.ceil(items.length / columns) - Math.ceil(gridWindow.end / columns));
  const bottomSpacer = bottomRows * rowStride;
  const visible = items.slice(gridWindow.start, gridWindow.end);

  return (
    <View>
      {topSpacer > 0 ? <View style={{ height: topSpacer }} /> : null}
      <PosterGrid>
        {visible.map((item, offset) => {
          const index = gridWindow.start + offset;
          const isLeftEdge = index % columns === 0;
          return (
            <CatalogPosterCard
              key={`${source.key}-${item.id}`}
              ref={
                index === 0
                  ? (node) => registerTvHomeCatalogFocus(node, 0)
                  : undefined
              }
              variant="grid"
              width={cardWidth}
              title={item.title}
              poster={item.poster}
              animeId={item.animeId}
              subtitle={item.subtitle}
              rating={item.score}
              onPress={() => openItem(item)}
              railStart={isLeftEdge}
              contentEntry={contentEntry && index === 0}
              onFocus={() => {
                setFocusedIndex(index);
                if (hasNextPage && !isFetchingNextPage && index >= items.length - columns * 2) {
                  fetchNextPage();
                }
              }}
            />
          );
        })}
      </PosterGrid>
      {bottomSpacer > 0 ? <View style={{ height: bottomSpacer }} /> : null}
      {isFetchingNextPage ? (
        <ActivityIndicator color={colors.brand} style={styles.footerLoader} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: spacing.xxl,
  },
  footerLoader: {
    marginVertical: spacing.lg,
  },
  empty: {
    color: colors.textSecondary,
    fontSize: 16,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
});
