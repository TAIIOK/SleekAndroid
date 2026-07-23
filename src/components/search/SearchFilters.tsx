import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SearchFilterSelect } from '@/components/search/SearchFilterSelect';
import { colors, radii, spacing, tvFocus } from '@/constants/aniverse';
import { isTvUi } from '@/lib/isTvUi';
import {
  SEARCH_AGE_RATING_OPTIONS,
  SEARCH_ANIME_STATUS_OPTIONS,
  SEARCH_ANIME_TYPE_OPTIONS,
  SEARCH_COUNTRY_OPTIONS,
  SEARCH_LAMPA_STATUS_OPTIONS,
  SEARCH_LANG_OPTIONS,
  SEARCH_ORDER_OPTIONS,
  SEARCH_RATING_MIN_OPTIONS,
  SEARCH_SEASON_OPTIONS,
  SEARCH_SORT_OPTIONS,
  searchYearOptions,
  usesAnimeFilters,
  usesLampaFilters,
  type SearchFilterState,
  type SearchMediaFilter,
} from '@/lib/searchConfig';

const MEDIA_OPTIONS: { id: SearchMediaFilter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'anime', label: 'Аниме' },
  { id: 'movie', label: 'Фильмы' },
  { id: 'tv', label: 'Сериалы' },
];

const YEAR_OPTIONS = searchYearOptions();

interface SearchFiltersProps {
  media: SearchMediaFilter;
  onMediaChange: (value: SearchMediaFilter) => void;
  filters: SearchFilterState;
  onFiltersChange: (patch: Partial<SearchFilterState>) => void;
  genres: Array<{ id: number | string; name: string }>;
  lampaGenres: Array<{ id: number | string; name: string }>;
}

export function SearchFilters({
  media,
  onMediaChange,
  filters,
  onFiltersChange,
  genres,
  lampaGenres,
}: SearchFiltersProps) {
  const showAnimeFilters = usesAnimeFilters(media);
  const showLampaFilters = usesLampaFilters(media);
  const set = (key: keyof SearchFilterState) => (value: string) =>
    onFiltersChange({ [key]: value });

  const animeGenreOptions = [
    { value: '', label: 'Все жанры' },
    ...genres.map((g) => ({ value: String(g.id), label: g.name })),
  ];
  const lampaGenreOptions = [
    { value: '', label: 'Все жанры' },
    ...lampaGenres.map((g) => ({ value: String(g.id), label: g.name })),
  ];

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>Тип контента</Text>
      <View style={styles.mediaRow}>
        {MEDIA_OPTIONS.map((option) => (
          <FilterChip
            key={option.id}
            label={option.label}
            active={media === option.id}
            onPress={() => onMediaChange(option.id)}
          />
        ))}
      </View>

      <Text style={styles.sectionLabel}>Общие</Text>
      <View style={styles.grid}>
        <SearchFilterSelect
          label="Сортировка"
          value={filters.sortBy}
          onChange={set('sortBy')}
          options={[...SEARCH_SORT_OPTIONS]}
        />
        <SearchFilterSelect
          label="Порядок"
          value={filters.order || 'desc'}
          onChange={set('order')}
          options={[...SEARCH_ORDER_OPTIONS]}
        />
        <SearchFilterSelect
          label="Год"
          value={filters.year}
          onChange={set('year')}
          options={YEAR_OPTIONS}
        />
      </View>

      {showAnimeFilters ? (
        <>
          <Text style={styles.sectionLabel}>Аниме</Text>
          <View style={styles.grid}>
            <SearchFilterSelect
              label="Жанр"
              value={filters.genre}
              onChange={set('genre')}
              options={animeGenreOptions}
            />
            <SearchFilterSelect
              label="Статус"
              value={filters.status}
              onChange={set('status')}
              options={[...SEARCH_ANIME_STATUS_OPTIONS]}
            />
            <SearchFilterSelect
              label="Тип аниме"
              value={filters.animeType}
              onChange={set('animeType')}
              options={[...SEARCH_ANIME_TYPE_OPTIONS]}
            />
            <SearchFilterSelect
              label="Сезон"
              value={filters.season}
              onChange={set('season')}
              options={[...SEARCH_SEASON_OPTIONS]}
            />
            <SearchFilterSelect
              label="Возраст"
              value={filters.ageRating}
              onChange={set('ageRating')}
              options={[...SEARCH_AGE_RATING_OPTIONS]}
            />
            <SearchFilterSelect
              label="Мин. рейтинг"
              value={filters.ratingMin}
              onChange={set('ratingMin')}
              options={[...SEARCH_RATING_MIN_OPTIONS]}
            />
          </View>
        </>
      ) : null}

      {showLampaFilters ? (
        <>
          <Text style={styles.sectionLabel}>Фильмы и сериалы</Text>
          <View style={styles.grid}>
            <SearchFilterSelect
              label="Жанр"
              value={filters.lampaGenre}
              onChange={set('lampaGenre')}
              options={lampaGenreOptions}
            />
            <SearchFilterSelect
              label="Статус"
              value={filters.lampaStatus}
              onChange={set('lampaStatus')}
              options={[...SEARCH_LAMPA_STATUS_OPTIONS]}
            />
            <SearchFilterSelect
              label="Мин. рейтинг"
              value={filters.lampaMinRating}
              onChange={set('lampaMinRating')}
              options={[...SEARCH_RATING_MIN_OPTIONS]}
            />
            <SearchFilterSelect
              label="Язык"
              value={filters.lampaLang}
              onChange={set('lampaLang')}
              options={[...SEARCH_LANG_OPTIONS]}
            />
            <SearchFilterSelect
              label="Страна"
              value={filters.lampaCountry}
              onChange={set('lampaCountry')}
              options={[...SEARCH_COUNTRY_OPTIONS]}
            />
          </View>
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
  wrap: { gap: spacing.md },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: spacing.xs,
  },
  mediaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
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
