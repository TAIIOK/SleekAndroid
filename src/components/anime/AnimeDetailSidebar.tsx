import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { LazyCatalogRail } from '@/components/catalog/LazyCatalogRail';
import { PosterRail, type RailItem } from '@/components/catalog/PosterRail';
import { layout, spacing } from '@/constants/aniverse';
import {
  animeListCardSubtitle,
  type AnimeRelatedItem,
} from '@/lib/animeDetail';
import { capDetailRailItems } from '@/lib/catalogRailPage';
import { isTvUi } from '@/lib/isTvUi';
import { mapAnimeToRailItem } from '@/lib/poster';

interface AnimeDetailRelatedProps {
  relatedItems: AnimeRelatedItem[];
  recommendationItems: AnimeRelatedItem[];
  similarItems: AnimeRelatedItem[];
  relatedLoading?: boolean;
  similarLoading?: boolean;
}

function toRailItems(items: AnimeRelatedItem[]) {
  return capDetailRailItems(items, isTvUi()).map((item) => ({
    ...mapAnimeToRailItem(item),
    subtitle: animeListCardSubtitle(item),
  }));
}

export function AnimeDetailSidebar({
  relatedItems,
  recommendationItems,
  similarItems,
  relatedLoading,
  similarLoading,
}: AnimeDetailRelatedProps) {
  const router = useRouter();
  const relatedRail = useMemo(() => toRailItems(relatedItems), [relatedItems]);
  const recommendationRail = useMemo(
    () => toRailItems(recommendationItems),
    [recommendationItems],
  );
  const similarRail = useMemo(() => toRailItems(similarItems), [similarItems]);
  const onItemPress = useCallback((item: RailItem) => {
    router.push(`/anime/${item.id}`);
  }, [router]);

  if (
    !relatedItems.length &&
    !relatedLoading &&
    !recommendationItems.length &&
    !similarItems.length &&
    !similarLoading
  ) {
    return null;
  }

  return (
    <View style={styles.rails}>
      {relatedItems.length > 0 || relatedLoading ? (
        <LazyCatalogRail>
          <PosterRail
            title="Связанные"
            items={relatedRail}
            loading={relatedLoading}
            itemWidth={layout.posterWidthDetail}
            flush
            onItemPress={onItemPress}
          />
        </LazyCatalogRail>
      ) : null}

      {recommendationItems.length > 0 || relatedLoading ? (
        <LazyCatalogRail>
          <PosterRail
            title="Рекомендации"
            items={recommendationRail}
            loading={relatedLoading}
            itemWidth={layout.posterWidthDetail}
            flush
            onItemPress={onItemPress}
          />
        </LazyCatalogRail>
      ) : null}

      {similarItems.length > 0 || similarLoading ? (
        <LazyCatalogRail>
          <PosterRail
            title="Похожее"
            items={similarRail}
            loading={similarLoading}
            itemWidth={layout.posterWidthDetail}
            flush
            onItemPress={onItemPress}
          />
        </LazyCatalogRail>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rails: {
    alignSelf: 'stretch',
    gap: isTvUi() ? spacing.md : spacing.sm,
  },
});
