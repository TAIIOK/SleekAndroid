import { Platform, StyleSheet, Text, View } from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing, tvFocus } from '@/constants/aniverse';
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
        <TvFocusable
          key={option.id}
          onPress={() => onStatusChange(option.id)}
          style={[styles.chip, status === option.id && styles.chipActive]}
        >
          <Text style={[styles.chipLabel, status === option.id && styles.chipLabelActive]}>
            {option.label}
          </Text>
        </TvFocusable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: Platform.isTV ? 4 : spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  chip: {
    flexShrink: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.06)',
    // Keep width stable with TvFocusable ring (layout shift skips neighbors on TV).
    borderWidth: tvFocus.borderWidth,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  chipLabel: {
    color: colors.textSecondary,
    fontSize: Platform.isTV ? 16 : 13,
    fontWeight: '600',
  },
  chipLabelActive: {
    color: colors.brandOn,
  },
});
