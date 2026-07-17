import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/aniverse';
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
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {OPTIONS.map((option) => (
        <FilterChip
          key={option.id}
          label={option.label}
          active={value === option.id}
          onPress={() => onChange(option.id)}
        />
      ))}
    </ScrollView>
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
      style={[styles.chip, (active || focused) && styles.chipActive]}
    >
      <Text style={styles.chipLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
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
