import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import type { AnimeDetail } from '@/api/catalog';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, spacing } from '@/constants/aniverse';
import { animeGenreNames } from '@/lib/animeDetail';

interface AnimeDetailPlotProps {
  detail: AnimeDetail;
}

export function AnimeDetailPlot({ detail }: AnimeDetailPlotProps) {
  const [expanded, setExpanded] = useState(false);
  const desc = detail.description?.trim() ?? '';
  const limit = Platform.isTV ? 320 : 420;
  const needsExpand = desc.length > limit;
  const cut = desc.lastIndexOf(' ', limit);
  const displayText =
    !needsExpand || expanded
      ? desc
      : `${desc.slice(0, cut > 0 ? cut : limit).trim()}…`;
  const genres = animeGenreNames(detail.genres);

  if (!desc && !genres.length) return null;

  return (
    <View style={styles.section}>
      {desc ? (
        <>
          <Text style={styles.title}>Сюжет</Text>
          <Text style={styles.body}>{displayText}</Text>
          {needsExpand ? (
            <TvFocusable onPress={() => setExpanded((v) => !v)} style={styles.more}>
              <Text style={styles.moreLabel}>{expanded ? 'Свернуть' : 'Подробнее'}</Text>
            </TvFocusable>
          ) : null}
        </>
      ) : null}

      {genres.length > 0 ? (
        <View style={styles.genres}>
          {genres.map((genre) => (
            <View key={genre} style={styles.genre}>
              <Text style={styles.genreText}>{genre}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  title: {
    color: colors.brand,
    fontSize: Platform.isTV ? 20 : 18,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  body: {
    color: colors.textSecondary,
    fontSize: Platform.isTV ? 14 : 14,
    lineHeight: Platform.isTV ? 22 : 22,
  },
  more: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingVertical: Platform.isTV ? 8 : 6,
    paddingHorizontal: Platform.isTV ? 8 : 4,
    justifyContent: 'center',
  },
  moreLabel: {
    color: colors.brand,
    fontSize: 14,
    fontWeight: '700',
  },
  genres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  genre: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  genreText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
});
