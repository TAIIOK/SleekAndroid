import { useRouter, useSegments } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/aniverse';
import { LIBRARY_HUB_TITLE, libraryHubTabs } from '@/lib/libraryHub';

export function LibraryHubLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const currentPath = `/${(segments as string[]).join('/')}`;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable onPress={() => router.push('/')} hitSlop={8}>
          <Text style={styles.back}>← Назад</Text>
        </Pressable>
        <Text style={styles.title}>{LIBRARY_HUB_TITLE}</Text>
      </View>

      <View style={styles.tabsRow}>
        {libraryHubTabs.map((tab) => {
          const active = currentPath === tab.to || currentPath.startsWith(`${tab.to}/`);
          return (
            <Pressable
              key={tab.to}
              onPress={() => router.push(tab.to as '/')}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
            </Pressable>
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
  back: {
    color: colors.brand,
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    color: colors.text,
    fontSize: 28,
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
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  tabLabel: {
    color: colors.textSecondary,
    fontSize: 14,
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
