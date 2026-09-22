import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { DetailPreviewRail } from '@/components/catalog/DetailPreviewRail';
import { type RailItem } from '@/components/catalog/PosterRail';
import { spacing } from '@/constants/aniverse';
import {
  animeListCardSubtitle,
  type AnimeRelatedItem,
} from '@/lib/animeDetail';
import { isTvUi } from '@/lib/isTvUi';
import {
  DETAIL_FOCUS_RECOMMENDATIONS,
  DETAIL_FOCUS_RELATED,
  DETAIL_FOCUS_SIMILAR,
} from '@/lib/detailFocus';
import { mapAnimeToRailItem } from '@/lib/poster';

interface AnimeDetailRelatedProps {
  animeId: number;
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
  animeId,
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
  const openFullList = useCallback(
    (section: 'related' | 'recommendations' | 'similar', title: string) => {
      router.push({
        pathname: '/detail-list',
        params: {
          media: 'anime',
          id: String(animeId),
          section,
          title,
        },
      });
    },
    [animeId, router],
  );

  return (
    <View style={styles.rails}>
      <DetailPreviewRail
        title="Связанные"
        items={relatedRail}
        loading={relatedLoading && relatedRail.length === 0}
        onItemPress={onItemPress}
        onSeeAll={() => openFullList('related', 'Связанные')}
        focusPriority={DETAIL_FOCUS_RELATED}
      />
      <DetailPreviewRail
        title="Рекомендации"
        items={recommendationRail}
        loading={relatedLoading && recommendationRail.length === 0}
        onItemPress={onItemPress}
        onSeeAll={() => openFullList('recommendations', 'Рекомендации')}
        focusPriority={DETAIL_FOCUS_RECOMMENDATIONS}
      />
      <DetailPreviewRail
        title="Похожее"
        items={similarRail}
        loading={similarLoading && similarRail.length === 0}
        onItemPress={onItemPress}
        onSeeAll={() => openFullList('similar', 'Похожее')}
        focusPriority={DETAIL_FOCUS_SIMILAR}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rails: {
    alignSelf: 'stretch',
    gap: isTvUi() ? spacing.md : spacing.sm,
  },
});
