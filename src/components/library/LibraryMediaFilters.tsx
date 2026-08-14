import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing, tvFocus } from '@/constants/aniverse';
import { isTvUi } from '@/lib/isTvUi';
import {
  MY_LISTS_MEDIA_OPTIONS,
  type MyListsMediaFilter,
} from '@/lib/myLists';

interface LibraryMediaFiltersProps {
  media: MyListsMediaFilter;
  onMediaChange: (value: MyListsMediaFilter) => void;
  counts?: Partial<Record<'anime' | 'movie' | 'tv', number>>;
}

export function LibraryMediaFilters({
  media,
  onMediaChange,
  counts,
}: LibraryMediaFiltersProps) {
  return (
    <View style={styles.wrap}>
      {MY_LISTS_MEDIA_OPTIONS.map((option, index) => {
        const active = media === option.id;
        const count =
          option.id !== 'all' && counts
            ? counts[option.id as 'anime' | 'movie' | 'tv']
            : undefined;
        const label = count != null ? `${option.label} · ${count}` : option.label;
        return (
          <TvFocusable
            key={option.id}
            onPress={() => onMediaChange(option.id)}
            style={[styles.chip, active && styles.chipActive]}
            focusedStyle={active ? styles.chipFocusedActive : styles.chipFocused}
            railStart={index === 0}
          >
            <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
          </TvFocusable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  chip: {
    flexShrink: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: tvFocus.borderWidth,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.brandAccent,
    borderColor: colors.brandAccent,
  },
  chipFocused: {
    borderColor: '#ffffff',
    backgroundColor: tvFocus.fill,
  },
  chipFocusedActive: {
    borderColor: '#ffffff',
    backgroundColor: colors.brandAccent,
  },
  chipLabel: {
    color: colors.textSecondary,
    fontSize: isTvUi() ? 16 : 13,
    fontWeight: '600',
  },
  chipLabelActive: {
    color: colors.text,
  },
});
