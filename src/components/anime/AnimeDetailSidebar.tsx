import { useRouter } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';

import type { AnimeDetail } from '@/api/catalog';
import { PosterRail } from '@/components/catalog/PosterRail';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { colors, layout, spacing } from '@/constants/aniverse';
import {
  animeScore,
  animeStudioName,
  localizedAnimeStatus,
} from '@/lib/animeDetail';
import { mapAnimeToRailItem } from '@/lib/poster';
import type { AnimeListItem } from '@aniverse/types';

interface AnimeDetailSidebarProps {
  detail: AnimeDetail;
  episodesTotal?: number;
  similarItems: AnimeListItem[];
  recommendationItems: AnimeListItem[];
  similarLoading?: boolean;
}

export function AnimeDetailSidebar({
  detail,
  episodesTotal,
  similarItems,
  recommendationItems,
  similarLoading,
}: AnimeDetailSidebarProps) {
  const router = useRouter();
  const status = detail.status ? localizedAnimeStatus(detail.status) : undefined;
  const studio = animeStudioName(detail);
  const score = animeScore(detail);
  const resolvedEpisodesTotal =
    episodesTotal ??
    (detail.episodesTotal != null && detail.episodesTotal > 0
      ? detail.episodesTotal
      : undefined);

  const metaRows = [
    { label: 'Статус', value: status },
    { label: 'Год', value: detail.year ? String(detail.year) : undefined },
    { label: 'Студия', value: studio },
    { label: 'Возраст', value: detail.ageRating },
    { label: 'Рейтинг', value: score != null ? score.toFixed(1) : undefined },
    {
      label: 'Эпизоды',
      value: resolvedEpisodesTotal != null ? String(resolvedEpisodesTotal) : undefined,
    },
  ].filter((row) => row.value);

  return (
    <View style={styles.sidebar}>
      {metaRows.length > 0 ? (
        <GlassSurface rounded="lg" style={styles.block}>
          {metaRows.map((row) => (
            <View key={row.label} style={styles.metaRow}>
              <Text style={styles.metaLabel}>{row.label}</Text>
              <Text style={styles.metaValue}>{row.value}</Text>
            </View>
          ))}
        </GlassSurface>
      ) : null}

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
    gap: Platform.isTV ? spacing.md : spacing.md,
  },
  block: {
    padding: Platform.isTV ? spacing.md : spacing.sm + 4,
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: Platform.isTV ? 8 : 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  metaLabel: {
    color: colors.textSecondary,
    fontSize: Platform.isTV ? 11 : 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  metaValue: {
    color: colors.text,
    fontSize: Platform.isTV ? 14 : 14,
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 1,
  },
});
