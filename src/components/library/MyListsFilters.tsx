import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing, tvFocus } from '@/constants/aniverse';
import { isTvUi } from '@/lib/isTvUi';
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
      {MY_LISTS_STATUS_OPTIONS.map((option, index) => {
        const active = status === option.id;
        return (
          <TvFocusable
            key={option.id}
            onPress={() => onStatusChange(option.id)}
            style={[styles.chip, active && styles.chipActive]}
            focusedStyle={active ? styles.chipFocusedActive : styles.chipFocused}
            railStart={index === 0}
          >
            <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
              {option.label}
            </Text>
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
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: isTvUi() ? 4 : spacing.xs,
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
    backgroundColor: 'rgba(195,192,255,0.18)',
    borderColor: colors.brand,
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
    fontSize: isTvUi() ? 16 : 13,
    fontWeight: '600',
  },
  chipLabelActive: {
    color: colors.brandTint,
  },
});
