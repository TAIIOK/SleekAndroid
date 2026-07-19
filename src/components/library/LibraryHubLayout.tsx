import { useRouter, useSegments } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing, tvFocus } from '@/constants/aniverse';
import { LIBRARY_HUB_TITLE, libraryHubTabs } from '@/lib/libraryHub';

function normalizePath(segments: string[]): string {
  const cleaned = segments.filter((segment) => !segment.startsWith('('));
  if (cleaned.length === 0) return '/';
  return `/${cleaned.join('/')}`;
}

export function LibraryHubLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const currentPath = normalizePath(segments as string[]);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        {!Platform.isTV ? (
          <TvFocusable onPress={() => router.push('/')} style={styles.backBtn}>
            <Text style={styles.back}>← Назад</Text>
          </TvFocusable>
        ) : null}
        <Text style={styles.title}>{LIBRARY_HUB_TITLE}</Text>
      </View>

      <View style={styles.tabsRow}>
        {libraryHubTabs.map((tab, index) => {
          const active = currentPath === tab.to || currentPath.startsWith(`${tab.to}/`);
          return (
            <TvFocusable
              key={tab.to}
              onPress={() => router.push(tab.to as '/')}
              style={[styles.tab, active && styles.tabActive]}
              focusedStyle={styles.tabFocused}
              hasTVPreferredFocus={active}
              railStart={index === 0}
              contentEntry={active}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
            </TvFocusable>
          );
        })}
      </View>

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  back: {
    color: colors.brand,
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    color: colors.text,
    fontSize: Platform.isTV ? 26 : 28,
    fontWeight: '700',
  },
  tabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  tab: {
    flexShrink: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: tvFocus.borderWidth,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  tabFocused: {
    borderColor: '#ffffff',
  },
  tabLabel: {
    color: colors.textSecondary,
    fontSize: Platform.isTV ? 16 : 14,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: colors.brandOn,
  },
  content: {
    flex: 1,
    minHeight: 0,
    paddingBottom: spacing.xl,
  },
});
