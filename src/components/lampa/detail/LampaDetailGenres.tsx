import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { LampaDetail } from '@/api/catalog';
import { colors, spacing } from '@/constants/aniverse';
import { lampaGenreNames } from '@/lib/lampaDetail';
import { isTvUi } from '@/lib/isTvUi';

interface LampaDetailGenresProps {
  detail: LampaDetail;
}

export function LampaDetailGenres({ detail }: LampaDetailGenresProps) {
  const genres = lampaGenreNames(detail.genres);
  if (!genres.length) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Жанры</Text>
      <View style={styles.genres}>
        {genres.map((genre) => (
          <View key={genre} style={styles.genre}>
            <Text style={styles.genreText}>{genre}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: '100%',
    gap: spacing.sm,
  },
  title: {
    color: colors.brand,
    fontSize: isTvUi() ? 22 : 18,
    fontWeight: '700',
  },
  genres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
