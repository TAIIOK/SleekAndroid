import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { LazyCatalogRail } from '@/components/catalog/LazyCatalogRail';
import { PosterRail } from '@/components/catalog/PosterRail';
import { layout, spacing } from '@/constants/aniverse';
import {
  animeListCardSubtitle,
  type AnimeRelatedItem,
} from '@/lib/animeDetail';
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
  return items.map((item) => ({
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
            items={toRailItems(relatedItems)}
            loading={relatedLoading}
            itemWidth={layout.posterWidthDetail}
            flush
            onItemPress={(item) => router.push(`/anime/${item.id}`)}
          />
        </LazyCatalogRail>
      ) : null}

      {recommendationItems.length > 0 || relatedLoading ? (
        <LazyCatalogRail>
          <PosterRail
            title="Рекомендации"
            items={toRailItems(recommendationItems)}
            loading={relatedLoading}
            itemWidth={layout.posterWidthDetail}
            flush
            onItemPress={(item) => router.push(`/anime/${item.id}`)}
          />
        </LazyCatalogRail>
      ) : null}

      {similarItems.length > 0 || similarLoading ? (
        <LazyCatalogRail>
          <PosterRail
            title="Похожее"
            items={toRailItems(similarItems)}
            loading={similarLoading}
            itemWidth={layout.posterWidthDetail}
            flush
            onItemPress={(item) => router.push(`/anime/${item.id}`)}
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
