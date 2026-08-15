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
      <View style={styles.segment}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  segment: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  chip: {
    flexShrink: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: 'transparent',
  },
  chipActive: {
    backgroundColor: colors.brandAccent,
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
    color: '#ffffff',
  },
});
