import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, layout, radii, spacing, tvFocus } from '@/constants/aniverse';
import { tvHorizontalCatalogScrollProps, tvRailSectionSnapProps } from '@/lib/tvCatalogScroll';
import { useTvShellFocus } from '@/providers/TvShellFocus';

export interface QuickActionCounts {
  bookmarks: number;
  lists: number;
  collections: number;
  history: number;
}

interface QuickActionsSectionProps {
  /** When omitted (TV), cards stay enabled and use static subtitles — no count fetches. */
  counts?: QuickActionCounts;
  /** First card is the top content entry when continue-watching is empty. */
  contentEntry?: boolean;
}

const actions = [
  {
    key: 'bookmarks' as const,
    title: 'Закладки',
    icon: 'bookmark' as const,
    href: '/library/bookmarks',
    subtitle: (n: number | undefined) =>
      n == null ? 'Избранное' : n === 0 ? 'Пусто' : itemsLabel(n),
  },
  {
    key: 'lists' as const,
    title: 'Мои списки',
    icon: 'list' as const,
    href: '/library/lists',
    subtitle: () => 'Персональные подборки',
  },
  {
    key: 'collections' as const,
    title: 'Коллекции',
    icon: 'albums' as const,
    href: '/library/collections',
    subtitle: (n: number | undefined) =>
      n == null ? 'Ваши подборки' : n === 0 ? 'Пусто' : itemsLabel(n),
  },
  {
    key: 'history' as const,
    title: 'История',
    icon: 'time' as const,
    href: '/history',
    subtitle: () => 'Недавние тайтлы',
  },
] as const;

const columns: Array<Array<(typeof actions)[number]['key']>> = [
  ['bookmarks', 'lists'],
  ['collections', 'history'],
];

function itemsLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} элемент`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} элемента`;
  return `${n} элементов`;
}

export function QuickActionsSection({ counts, contentEntry = false }: QuickActionsSectionProps) {
  const actionByKey = Object.fromEntries(actions.map((action) => [action.key, action])) as Record<
    (typeof actions)[number]['key'],
    (typeof actions)[number]
  >;
  const horizontalPad = Platform.isTV ? layout.gutterDesktop : layout.gutterMobile;

  if (Platform.isTV) {
    return (
      <View style={styles.wrap} {...tvRailSectionSnapProps}>
        <SectionHeader title="Быстрые действия" variant="quick" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.rail, { paddingHorizontal: horizontalPad }]}
          {...tvHorizontalCatalogScrollProps}
        >
          {actions.map((action, index) => (
            <QuickActionCard
              key={action.key}
              action={action}
              count={counts?.[action.key]}
              alwaysEnabled
              railStart={index === 0}
              contentEntry={contentEntry && index === 0}
              spaced
            />
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <SectionHeader title="Быстрые действия" variant="quick" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        <View
          style={Platform.OS === 'web' ? undefined : styles.grid}
          className={Platform.OS === 'web' ? 'quick-actions-grid' : undefined}
        >
          {columns.map((column) => (
            <View key={column.join('-')} style={styles.column}>
              {column.map((key) => (
                <QuickActionCard
                  key={key}
                  action={actionByKey[key]}
                  count={counts?.[key] ?? 0}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function QuickActionCard({
  action,
  count,
  alwaysEnabled = false,
  railStart = false,
  contentEntry = false,
  spaced = false,
}: {
  action: (typeof actions)[number];
  count?: number;
  alwaysEnabled?: boolean;
  railStart?: boolean;
  contentEntry?: boolean;
  spaced?: boolean;
}) {
  const router = useRouter();
  const [focused, setFocused] = useState(false);
  const shellFocus = useTvShellFocus();
  const enabled =
    alwaysEnabled || action.key === 'history' || action.key === 'lists' || (count ?? 0) > 0;
  const exitLeft = Platform.isTV && railStart;
  const exitUp = Platform.isTV && contentEntry;
  const sidebarTag = exitLeft ? shellFocus?.sidebarNativeTag : undefined;

  const inner = (
    <>
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, focused && styles.iconWrapFocused]}>
          <Ionicons name={action.icon} size={Platform.isTV ? 18 : 14} color={colors.brand} />
        </View>
        <Text style={[styles.cardTitle, focused && styles.cardTitleFocused]}>{action.title}</Text>
      </View>
      <Text style={[styles.cardSubtitle, focused && styles.cardSubtitleFocused]}>
        {action.subtitle(count)}
      </Text>
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <Pressable
        disabled={!enabled}
        onPress={() => router.push(action.href as '/')}
        className="quick-action-card"
        style={!enabled ? { opacity: 0.55 } : undefined}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <Pressable
      disabled={!enabled}
      focusable={enabled}
      onPress={() => router.push(action.href as '/')}
      onFocus={() => {
        setFocused(true);
        if (exitLeft) shellFocus?.setExitLeftEnabled(true);
        if (exitUp) shellFocus?.setExitUpEnabled(true);
      }}
      onBlur={() => {
        setFocused(false);
        if (exitLeft) shellFocus?.setExitLeftEnabled(false);
        if (exitUp) shellFocus?.setExitUpEnabled(false);
      }}
      style={[
        styles.cardPressable,
        spaced && styles.cardSpaced,
        !enabled && styles.cardDisabled,
        focused && styles.cardFocused,
      ]}
      {...(contentEntry && Platform.isTV ? { hasTVPreferredFocus: true } : {})}
      {...(sidebarTag != null ? { nextFocusLeft: sidebarTag } : {})}
    >
      <LinearGradient
        colors={['#1b1b24', '#1f1f28']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, focused && styles.cardInnerFocused]}
      >
        {inner}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: Platform.isTV ? spacing.md : 32,
  },
  rail: {
    paddingHorizontal: Platform.isTV ? 0 : spacing.md,
    paddingTop: Platform.isTV ? 8 : 0,
    paddingBottom: Platform.isTV ? 10 : spacing.sm,
    gap: Platform.isTV ? 10 : 0,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    gap: 12,
  },
  cardPressable: {
    width: layout.quickActionCardWidth,
    height: layout.quickActionCardHeight,
    borderRadius: radii.quickAction,
    overflow: 'hidden',
    borderWidth: Platform.isTV ? tvFocus.borderWidth : 0,
    borderColor: 'transparent',
  },
  cardSpaced: {
    marginRight: 0,
  },
  cardFocused: {
    zIndex: 2,
    borderColor: tvFocus.borderColor,
    backgroundColor: tvFocus.wash,
  },
  card: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: radii.quickAction,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: Platform.isTV ? 14 : 10,
    justifyContent: 'space-between',
  },
  cardInnerFocused: {
    borderColor: 'transparent',
  },
  cardDisabled: {
    opacity: 0.55,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconWrap: {
    width: Platform.isTV ? 32 : 28,
    height: Platform.isTV ? 32 : 28,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapFocused: {
    backgroundColor: 'rgba(195,192,255,0.22)',
  },
  cardTitle: {
    color: colors.text,
    fontSize: Platform.isTV ? 16 : 14,
    lineHeight: Platform.isTV ? 22 : 18,
    fontWeight: '600',
    flex: 1,
    backgroundColor: 'transparent',
  },
  cardTitleFocused: {
    color: tvFocus.titleColor,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: colors.textSecondary,
    fontSize: Platform.isTV ? 13 : 11,
    lineHeight: Platform.isTV ? 18 : 15,
    backgroundColor: 'transparent',
  },
  cardSubtitleFocused: {
    color: colors.brand,
  },
});
