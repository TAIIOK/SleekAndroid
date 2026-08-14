import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { findNodeHandle, Pressable, StyleSheet, Text, View } from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, layout, radii, spacing, tvFocus } from '@/constants/aniverse';
import { isTvUi } from '@/lib/isTvUi';
import { registerTvHomeFiltersFocus } from '@/lib/tvHomeFocusHandoff';
import {
  TV_HOME_TYPE_FILTERS,
  type TvHomeTypeFilter,
} from '@/lib/tvHomeFeeds';
import { useTvShellFocus } from '@/providers/TvShellFocus';

interface TvHomeTypeFiltersProps {
  value: TvHomeTypeFilter;
  onChange: (value: TvHomeTypeFilter) => void;
  options?: { id: TvHomeTypeFilter; label: string }[];
  /** First type segment is the TV content entry (Up→sidebar). */
  contentEntry?: boolean;
  /** Opens home feed settings (shared with Sleek / backend config). */
  onOpenSettings?: () => void;
}

export function TvHomeTypeFilters({
  value,
  onChange,
  options = TV_HOME_TYPE_FILTERS,
  contentEntry = false,
  onOpenSettings,
}: TvHomeTypeFiltersProps) {
  const router = useRouter();
  const shellFocus = useTvShellFocus();
  const [rowExitTag, setRowExitTag] = useState<number | undefined>();

  if (!options.length) return null;

  return (
    <View style={styles.row}>
      <View style={styles.segment}>
        {options.map((option, index) => {
          const active = value === option.id;
          const isEntry = contentEntry && index === 0;
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
              nextFocusLeft={isRailStart ? rowExitTag : undefined}
              hostRef={index === 0 ? registerTvHomeFiltersFocus : undefined}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {option.label}
              </Text>
            </TvFocusable>
          );
        })}
      </View>

      {onOpenSettings ? (
        <TvFocusable
          onPress={onOpenSettings}
          style={styles.iconBtn}
          focusedStyle={styles.iconFocused}
          accessibilityLabel="Настройки лент"
        >
          <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
        </TvFocusable>
      ) : null}

      <TvFocusable
        onPress={() => router.navigate('/search')}
        style={styles.iconBtn}
        focusedStyle={styles.iconFocused}
        accessibilityLabel="Поиск"
        railEnd
      >
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
      </TvFocusable>

      {isTvUi() ? (
        <Pressable
          ref={(node) => {
            const tag =
              node != null
                ? (findNodeHandle(node as Parameters<typeof findNodeHandle>[0]) ?? undefined)
                : undefined;
            setRowExitTag((prev) => (prev === tag ? prev : tag));
          }}
          collapsable={false}
          focusable={!shellFocus?.menuOpen}
          onFocus={() => {
            shellFocus?.requestSidebarFocus();
          }}
          style={styles.rowExit}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: layout.gutterDesktop,
    paddingVertical: spacing.xs,
  },
  rowExit: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 1,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  tab: {
    flexShrink: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: colors.brandAccent,
  },
  tabFocused: {
    borderColor: '#ffffff',
    backgroundColor: tvFocus.fill,
  },
  tabFocusedActive: {
    borderColor: '#ffffff',
    backgroundColor: colors.brandAccent,
  },
  tabLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#ffffff',
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  iconFocused: {
    borderColor: '#ffffff',
    backgroundColor: tvFocus.fill,
  },
});
