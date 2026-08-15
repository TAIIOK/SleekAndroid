import { useRouter, useSegments } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing, tvFocus } from '@/constants/aniverse';
import { LIBRARY_HUB_TITLE, libraryHubTabs } from '@/lib/libraryHub';
import { isTvUi } from '@/lib/isTvUi';

function normalizePath(segments: string[]): string {
  const cleaned = segments.filter((segment) => !segment.startsWith('('));
  if (cleaned.length === 0) return '/';
  return `/${cleaned.join('/')}`;
}

/** Page-level Медиатека title + hub tabs (normal layout flow, not overlay). */
export function LibraryHubChrome() {
  const router = useRouter();
  const segments = useSegments();
  const currentPath = normalizePath(segments as string[]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{LIBRARY_HUB_TITLE}</Text>
      <View style={styles.segment}>
        {libraryHubTabs.map((tab, index) => {
          const active = currentPath === tab.to || currentPath.startsWith(`${tab.to}/`);
          return (
            <TvFocusable
              key={tab.to}
              onPress={() => router.push(tab.to as '/')}
              style={[styles.tab, active && styles.tabActive]}
              focusedStyle={active ? styles.tabFocusedActive : styles.tabFocused}
              hasTVPreferredFocus={active}
              railStart={index === 0}
              contentEntry={active}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
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
    paddingTop: isTvUi() ? spacing.xl : 0,
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: isTvUi() ? 26 : 28,
    fontWeight: '700',
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
    fontSize: isTvUi() ? 16 : 14,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#ffffff',
  },
});
