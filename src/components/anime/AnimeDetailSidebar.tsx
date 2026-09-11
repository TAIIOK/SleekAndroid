import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { DetailCollapsibleRail } from '@/components/catalog/DetailCollapsibleSection';
import { type RailItem } from '@/components/catalog/PosterRail';
import { spacing } from '@/constants/aniverse';
import {
  animeListCardSubtitle,
  type AnimeRelatedItem,
} from '@/lib/animeDetail';
import { capDetailRailItems } from '@/lib/catalogRailPage';
import type { DetailExtraSection } from '@/lib/detailSections';
import { isTvUi } from '@/lib/isTvUi';
import { mapAnimeToRailItem } from '@/lib/poster';

interface AnimeDetailRelatedProps {
  relatedItems: AnimeRelatedItem[];
  recommendationItems: AnimeRelatedItem[];
  similarItems: AnimeRelatedItem[];
  relatedLoading?: boolean;
  similarLoading?: boolean;
  relatedFetched?: boolean;
  similarFetched?: boolean;
  openId: DetailExtraSection | null;
  onToggle: (id: DetailExtraSection) => void;
}

function toRailItems(items: AnimeRelatedItem[]) {
  return capDetailRailItems(items).map((item) => ({
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
  relatedFetched = false,
  similarFetched = false,
  openId,
  onToggle,
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

  return (
    <View style={styles.rails}>
      <DetailCollapsibleRail
        title="Связанные"
        expanded={openId === 'related'}
        onToggle={() => onToggle('related')}
        items={relatedRail}
        loading={relatedLoading}
        fetched={relatedFetched}
        onItemPress={onItemPress}
      />
      <DetailCollapsibleRail
        title="Рекомендации"
        expanded={openId === 'recommendations'}
        onToggle={() => onToggle('recommendations')}
        items={recommendationRail}
        loading={relatedLoading}
        fetched={relatedFetched}
        onItemPress={onItemPress}
      />
      <DetailCollapsibleRail
        title="Похожее"
        expanded={openId === 'similar'}
        onToggle={() => onToggle('similar')}
        items={similarRail}
        loading={similarLoading}
        fetched={similarFetched}
        onItemPress={onItemPress}
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
