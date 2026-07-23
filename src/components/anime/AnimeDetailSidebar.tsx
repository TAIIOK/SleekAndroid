import { useRouter } from 'expo-router';
import {
  StyleSheet,
  View,
} from 'react-native';

import { PosterRail } from '@/components/catalog/PosterRail';
import { colors, layout, spacing } from '@/constants/aniverse';
import { mapAnimeToRailItem } from '@/lib/poster';
import type { AnimeListItem } from '@aniverse/types';
import { isTvUi } from '@/lib/isTvUi';

interface AnimeDetailSidebarProps {
  similarItems: AnimeListItem[];
  recommendationItems: AnimeListItem[];
  similarLoading?: boolean;
}

export function AnimeDetailSidebar({
  similarItems,
  recommendationItems,
  similarLoading,
}: AnimeDetailSidebarProps) {
  const router = useRouter();

  if (!similarItems.length && !similarLoading && !recommendationItems.length) {
    return null;
  }

  return (
    <View style={styles.sidebar}>
      {similarItems.length > 0 || similarLoading ? (
        <PosterRail
          title="Похожее"
          items={similarItems.map(mapAnimeToRailItem)}
          loading={similarLoading}
          itemWidth={layout.posterWidthDetail}
          flush
          onItemPress={(item) => router.push(`/anime/${item.id}`)}
        />
      ) : null}

      {recommendationItems.length > 0 ? (
        <PosterRail
          title="Рекомендации"
          items={recommendationItems.map(mapAnimeToRailItem)}
          itemWidth={layout.posterWidthDetail}
          flush
          onItemPress={(item) => router.push(`/anime/${item.id}`)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    alignSelf: 'stretch',
    gap: isTvUi() ? spacing.md : spacing.md,
  },
});
