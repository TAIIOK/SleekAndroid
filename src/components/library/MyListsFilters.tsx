import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/aniverse';
import {
  MY_LISTS_STATUS_OPTIONS,
  type MyListsStatusFilter,
} from '@/lib/myLists';

interface MyListsFiltersProps {
  status: MyListsStatusFilter;
  onStatusChange: (value: MyListsStatusFilter) => void;
}

export function MyListsFilters({ status, onStatusChange }: MyListsFiltersProps) {
  return (
    <View style={styles.row}>
      {MY_LISTS_STATUS_OPTIONS.map((option) => (
        <FilterChip
          key={option.id}
          label={option.label}
          active={status === option.id}
          onPress={() => onStatusChange(option.id)}
        />
      ))}
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
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  chip: {
    flexShrink: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  chipLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  chipLabelActive: {
    color: colors.brandOn,
  },
});
