import { Linking, StyleSheet, Text, View } from 'react-native';

import type { LampaExternalRating } from '@/api/lampaRatings';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';

function accent(source: LampaExternalRating['source']): string {
  switch (source) {
    case 'imdb':
      return '#f5c518';
    case 'kinopoisk':
      return '#ff6600';
    case 'rotten_tomatoes':
      return '#fa320a';
    case 'metacritic':
      return '#6c3';
    default:
      return colors.brand;
  }
}

export function LampaExternalRatingsRow({
  ratings,
}: {
  ratings: LampaExternalRating[];
}) {
  if (!ratings.length) return null;

  return (
    <View style={styles.row}>
      {ratings.map((rating) => {
        const value = `${rating.value.toFixed(1)}${rating.max === 100 ? '%' : ''}`;
        const chip = (
          <View style={[styles.chip, { borderColor: accent(rating.source) }]}>
            <Text style={[styles.label, { color: accent(rating.source) }]}>
              {rating.label}
            </Text>
            <Text style={styles.value}>{value}</Text>
          </View>
        );
        if (!rating.url) return <View key={rating.source}>{chip}</View>;
        return (
          <TvFocusable
            key={rating.source}
            onPress={() => void Linking.openURL(rating.url!)}
          >
            {chip}
          </TvFocusable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minWidth: 64,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.md,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
  },
  label: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  value: { color: colors.text, fontWeight: '800', fontSize: 14, marginTop: 2 },
});
