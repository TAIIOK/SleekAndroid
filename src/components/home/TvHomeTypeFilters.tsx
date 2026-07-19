import { StyleSheet, Text, View } from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing, tvFocus } from '@/constants/aniverse';
import {
  TV_HOME_TYPE_FILTERS,
  type TvHomeTypeFilter,
} from '@/lib/tvHomeFeeds';

interface TvHomeTypeFiltersProps {
  value: TvHomeTypeFilter;
  onChange: (value: TvHomeTypeFilter) => void;
  options?: { id: TvHomeTypeFilter; label: string }[];
  /** When Continue Watching is empty, first type chip is the content entry. */
  contentEntry?: boolean;
  /** Opens home feed settings (shared with Sleek / backend config). */
  onOpenSettings?: () => void;
  /** Number of feeds enabled for the current type (excludes «Все»). */
  selectedFeedCount?: number;
}

export function TvHomeTypeFilters({
  value,
  onChange,
  options = TV_HOME_TYPE_FILTERS,
  contentEntry = false,
  onOpenSettings,
  selectedFeedCount,
}: TvHomeTypeFiltersProps) {
  if (!options.length) return null;

  return (
    <View style={styles.row}>
      {options.map((option, index) => {
        const active = value === option.id;
        const isEntry = contentEntry && index === 0;
        // First chip always exits Left→sidebar; Up only when this row is the content entry.
        const isRailStart = index === 0;
        return (
          <TvFocusable
            key={option.id}
            onPress={() => onChange(option.id)}
            style={[styles.tab, active && styles.tabActive]}
            focusedStyle={active ? styles.tabFocusedActive : styles.tabFocused}
            hasTVPreferredFocus={isEntry}
            railStart={isRailStart}
            contentEntry={isEntry}
          >
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{option.label}</Text>
          </TvFocusable>
        );
      })}

      {onOpenSettings ? (
        <TvFocusable
          onPress={onOpenSettings}
          style={styles.settingsBtn}
          focusedStyle={styles.tabFocused}
        >
          <Text style={styles.settingsLabel}>
            {selectedFeedCount != null && selectedFeedCount > 0
              ? `Настройки · ${selectedFeedCount}`
              : 'Настройки лент'}
          </Text>
        </TvFocusable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tab: {
    flexShrink: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: tvFocus.borderWidth,
    borderColor: colors.border,
  },
  // Soft tint (not solid brand) so focus ring stays readable.
  tabActive: {
    backgroundColor: 'rgba(195,192,255,0.18)',
    borderColor: colors.brand,
  },
  tabFocused: {
    borderColor: '#ffffff',
    backgroundColor: tvFocus.fill,
  },
  tabFocusedActive: {
    borderColor: '#ffffff',
    backgroundColor: 'rgba(195,192,255,0.32)',
  },
  tabLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: colors.brandTint,
  },
  settingsBtn: {
    flexShrink: 0,
    marginLeft: 'auto',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: tvFocus.borderWidth,
    borderColor: colors.brand,
    backgroundColor: 'rgba(167,139,250,0.12)',
  },
  settingsLabel: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: '700',
  },
});
