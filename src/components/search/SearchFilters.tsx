import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radii, spacing, tvFocus } from '@/constants/aniverse';
import { isTvUi } from '@/lib/isTvUi';
import {
  SEARCH_YEAR_OPTIONS,
  usesAnimeFilters,
  type SearchMediaFilter,
} from '@/lib/searchConfig';

const MEDIA_OPTIONS: { id: SearchMediaFilter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'anime', label: 'Аниме' },
  { id: 'movie', label: 'Фильмы' },
  { id: 'tv', label: 'Сериалы' },
];

interface SearchFiltersProps {
  media: SearchMediaFilter;
  onMediaChange: (value: SearchMediaFilter) => void;
  genre: string;
  onGenreChange: (value: string) => void;
  year: string;
  onYearChange: (value: string) => void;
  genres: Array<{ id: number; name: string }>;
}

export function SearchFilters({
  media,
  onMediaChange,
  genre,
  onGenreChange,
  year,
  onYearChange,
  genres,
}: SearchFiltersProps) {
  const showAnimeFilters = usesAnimeFilters(media);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {MEDIA_OPTIONS.map((option) => (
          <FilterChip
            key={option.id}
            label={option.label}
            active={media === option.id}
            onPress={() => onMediaChange(option.id)}
          />
        ))}
      </View>

      {showAnimeFilters ? (
        <>
          <Text style={styles.sectionLabel}>Жанр</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            <FilterChip
              label="Все жанры"
              active={!genre}
              onPress={() => onGenreChange('')}
            />
            {genres.map((item) => (
              <FilterChip
                key={item.id}
                label={item.name}
                active={genre === String(item.id)}
                onPress={() => onGenreChange(String(item.id))}
              />
            ))}
          </ScrollView>

          <Text style={styles.sectionLabel}>Год</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            <FilterChip label="Любой" active={!year} onPress={() => onYearChange('')} />
            {SEARCH_YEAR_OPTIONS.map((value) => (
              <FilterChip
                key={value}
                label={value}
                active={year === value}
                onPress={() => onYearChange(value)}
              />
            ))}
          </ScrollView>
        </>
      ) : null}
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={[styles.chip, (active || focused) && styles.chipActive, focused && styles.chipFocused]}
    >
      <Text style={styles.chipLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    flexWrap: isTvUi() ? 'nowrap' : 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.bgCard,
    borderWidth: tvFocus.borderWidth,
    borderColor: colors.border,
  },
  chipActive: {
    borderColor: colors.brand,
    backgroundColor: 'rgba(195,192,255,0.12)',
  },
  chipFocused: {
    borderColor: tvFocus.borderColor,
    backgroundColor: tvFocus.fill,
  },
  chipLabel: {
    color: colors.text,
    fontSize: isTvUi() ? 15 : 14,
    fontWeight: '600',
  },
});
