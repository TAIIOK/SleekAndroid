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
      {OPTIONS.map((option, index) => {
        const active = value === option.id;
        return (
          <TvFocusable
            key={option.id}
            onPress={() => onChange(option.id)}
            style={[styles.chip, active && styles.chipActive]}
            focusedStyle={active ? styles.chipFocusedActive : styles.chipFocused}
            railStart={index === 0}
          >
            <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{option.label}</Text>
          </TvFocusable>
        );
      })}
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
    backgroundColor: 'rgba(195,192,255,0.18)',
  },
  chipFocused: {
    borderColor: '#ffffff',
    backgroundColor: tvFocus.fill,
  },
  chipFocusedActive: {
    borderColor: '#ffffff',
    backgroundColor: 'rgba(195,192,255,0.32)',
  },
  chipLabel: {
    color: colors.textSecondary,
    fontSize: Platform.isTV ? 16 : 14,
    fontWeight: '600',
  },
  chipLabelActive: {
    color: colors.brandTint,
  },
});
