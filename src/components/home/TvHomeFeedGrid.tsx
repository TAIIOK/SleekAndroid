import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { CatalogPosterCard } from '@/components/catalog/CatalogPosterCard';
import { PosterGrid, usePosterGridCardWidth } from '@/components/catalog/PosterGrid';
import { colors, spacing } from '@/constants/aniverse';
import { usePosterGridLayout } from '@/hooks/usePosterGridLayout';
import { useTvHomeFeedSource } from '@/hooks/useTvHomeFeedSource';
import type { CatalogHomeConfig } from '@/lib/homeSettings';
import type { TvHomeFeedSource } from '@/lib/tvHomeFeeds';

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
  const { columns } = usePosterGridLayout();

  if (isLoading && !items.length) {
    return <ActivityIndicator color={colors.brand} style={styles.loader} />;
  }

  if (isError && !items.length) {
    return <Text style={styles.empty}>{errorMessage ?? 'Не удалось загрузить ленту'}</Text>;
  }

  if (!items.length) {
    return <Text style={styles.empty}>В этой ленте пока ничего нет</Text>;
  }

  return (
    <View>
      <PosterGrid>
        {items.map((item, index) => {
          const isLeftEdge = index % columns === 0;
          return (
            <CatalogPosterCard
              key={`${source.key}-${item.id}`}
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
                if (hasNextPage && !isFetchingNextPage && index >= items.length - columns * 2) {
                  fetchNextPage();
                }
              }}
            />
          );
        })}
      </PosterGrid>
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
