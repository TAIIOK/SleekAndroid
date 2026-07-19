import { Platform, StyleSheet, Text, View } from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing, tvFocus } from '@/constants/aniverse';
import type { HistoryMediaFilter } from '@/lib/history';

const OPTIONS: { id: HistoryMediaFilter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'anime', label: 'Аниме' },
  { id: 'movie', label: 'Фильмы' },
  { id: 'tv', label: 'Сериалы' },
];

export function HistoryMediaFilters({
  value,
  onChange,
}: {
  value: HistoryMediaFilter;
  onChange: (value: HistoryMediaFilter) => void;
}) {
  return (
    <View style={styles.row}>
      {OPTIONS.map((option) => (
        <TvFocusable
          key={option.id}
          onPress={() => onChange(option.id)}
          style={[styles.chip, value === option.id && styles.chipActive]}
        >
          <Text style={styles.chipLabel}>{option.label}</Text>
        </TvFocusable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    paddingTop: Platform.isTV ? 4 : 0,
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
  chipLabel: {
    color: colors.text,
    fontSize: Platform.isTV ? 16 : 14,
    fontWeight: '600',
  },
});
