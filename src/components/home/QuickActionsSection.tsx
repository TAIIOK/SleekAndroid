import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  findNodeHandle,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { TvFocusGuide } from '@/components/tv/TvFocusGuide';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, layout, radii, spacing, tvFocus } from '@/constants/aniverse';
import {
  useTvCatalogVerticalNeighbors,
  useTvCatalogVerticalSnapshot,
} from '@/hooks/useTvCatalogVerticalNeighbors';
import { useTvRailFocusRestore } from '@/hooks/useTvRailFocusRestore';
import { setActivePartyRoomId } from '@/lib/activePartyRoom';
import {
  DEFAULT_HOME_QUICK_ACTION_IDS,
  HOME_QUICK_ACTIONS_RAIL_PRIORITY,
  resolveHomeQuickActions,
  type HomeQuickActionDef,
  type HomeQuickActionId,
} from '@/lib/homeQuickActions';
import { openHomeSettings } from '@/lib/homeSettingsBridge';
import { isTvUi } from '@/lib/isTvUi';
import { partyRoomHref } from '@/lib/partyRoomRoute';
import { tvHorizontalCatalogScrollProps, tvRailSectionSnapProps } from '@/lib/tvCatalogScroll';
import { registerTvCatalogRail } from '@/lib/tvCatalogVerticalFocus';

export interface QuickActionCounts {
  bookmarks: number;
  lists: number;
  collections: number;
  history: number;
}

export interface QuickActionActiveParty {
  id: string;
  title: string;
}

interface QuickActionsSectionProps {
  /** When omitted (TV), cards stay enabled and use static subtitles — no count fetches. */
  counts?: QuickActionCounts;
  /** First card is the top content entry when continue-watching is empty. */
  contentEntry?: boolean;
  /** Active party room — shown as a leading quick-return card on phone. */
  activeParty?: QuickActionActiveParty;
  /** TV-only visible/ordered cards. Empty hides the rail. Phone ignores this. */
  actionIds?: HomeQuickActionId[];
}

const phoneActions = [
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
    title: 'Медиатека',
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

const columns: Array<Array<(typeof phoneActions)[number]['key']>> = [
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

export function QuickActionsSection({
  counts,
  activeParty,
  actionIds,
}: QuickActionsSectionProps) {
  const actionByKey = Object.fromEntries(phoneActions.map((action) => [action.key, action])) as Record<
    (typeof phoneActions)[number]['key'],
    (typeof phoneActions)[number]
  >;
  const horizontalPad = isTvUi() ? layout.gutterDesktop : layout.gutterMobile;
  const tvActions = useMemo(
    () => resolveHomeQuickActions(actionIds ?? DEFAULT_HOME_QUICK_ACTION_IDS),
    [actionIds],
  );
  const neighbors = useTvCatalogVerticalNeighbors('/', HOME_QUICK_ACTIONS_RAIL_PRIORITY);
  const qaRailTag = useTvCatalogVerticalSnapshot('/').rails.find(
    (rail) => rail.priority === HOME_QUICK_ACTIONS_RAIL_PRIORITY,
  )?.tag;
  const { bindItem } = useTvRailFocusRestore(tvActions.length, {
    stealHorizontalEscape: isTvUi(),
  });
  const settingsTagRef = useRef<number | undefined>();
  const [settingsTag, setSettingsTag] = useState<number | undefined>();

  const captureSettingsHost = (node: View | null) => {
    if (node == null) return;
    const tag = findNodeHandle(node as Parameters<typeof findNodeHandle>[0]) ?? undefined;
    if (tag == null || settingsTagRef.current === tag) return;
    settingsTagRef.current = tag;
    setSettingsTag(tag);
  };

  if (isTvUi()) {
    if (!tvActions.length) return null;
    const rail = (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.rail, { paddingHorizontal: horizontalPad }]}
        {...tvHorizontalCatalogScrollProps}
      >
        {tvActions.map((action, index) => {
          const railFocus = bindItem(index);
          return (
            <TvQuickActionCard
              key={action.id}
              action={action}
              railStart={index === 0}
              railEnd={index === tvActions.length - 1}
              nextFocusUp={settingsTag ?? neighbors.up}
              nextFocusDown={neighbors.down}
              onFocus={railFocus.onFocus}
              onBlur={railFocus.onBlur}
              hostRef={(node) => {
                railFocus.ref?.(node);
                if (index === 0 && node) {
                  registerTvCatalogRail('/', HOME_QUICK_ACTIONS_RAIL_PRIORITY, node);
                }
              }}
            />
          );
        })}
      </ScrollView>
    );

    return (
      <View style={styles.wrap} {...tvRailSectionSnapProps}>
        <SectionHeader
          title="Быстрые действия"
          variant="quick"
          seeAllLabel="Настроить"
          onSeeAll={openHomeSettings}
          seeAllHostRef={captureSettingsHost}
          seeAllNextFocusUp={neighbors.up}
          seeAllNextFocusDown={qaRailTag}
          seeAllNextFocusLeft={qaRailTag}
        />
        <TvFocusGuide trapFocusRight>{rail}</TvFocusGuide>
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
          {activeParty ? (
            <View style={styles.column}>
              <PartyQuickActionCard party={activeParty} />
            </View>
          ) : null}
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

function PartyQuickActionCard({ party }: { party: QuickActionActiveParty }) {
  const router = useRouter();
  const [focused, setFocused] = useState(false);

  const openParty = () => {
    void setActivePartyRoomId(party.id).then(() => {
      router.push(partyRoomHref(party.id));
    });
  };

  const inner = (
    <>
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, focused && styles.iconWrapFocused]}>
          <Ionicons name="people" size={14} color={colors.brand} />
        </View>
        <Text style={[styles.cardTitle, focused && styles.cardTitleFocused]}>Комната</Text>
      </View>
      <Text style={[styles.cardSubtitle, focused && styles.cardSubtitleFocused]} numberOfLines={2}>
        {party.title}
      </Text>
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <Pressable onPress={openParty} className="quick-action-card">
        {inner}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={openParty}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[styles.cardPressable, focused && styles.cardFocused]}
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

function QuickActionCard({
  action,
  count,
}: {
  action: (typeof phoneActions)[number];
  count?: number;
}) {
  const router = useRouter();
  const [focused, setFocused] = useState(false);
  const enabled =
    action.key === 'history' || action.key === 'lists' || (count ?? 0) > 0;

  const inner = (
    <>
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, focused && styles.iconWrapFocused]}>
          <Ionicons name={action.icon} size={14} color={colors.brand} />
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
        onPress={() => router.push(action.href as Href)}
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
      onPress={() => router.push(action.href as Href)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[styles.cardPressable, !enabled && styles.cardDisabled, focused && styles.cardFocused]}
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

function TvQuickActionCard({
  action,
  railStart,
  railEnd,
  nextFocusUp,
  nextFocusDown,
  onFocus,
  onBlur,
  hostRef,
}: {
  action: HomeQuickActionDef;
  railStart?: boolean;
  railEnd?: boolean;
  nextFocusUp?: number;
  nextFocusDown?: number;
  onFocus?: () => void;
  onBlur?: () => void;
  hostRef?: (node: View | null) => void;
}) {
  const router = useRouter();
  const [focused, setFocused] = useState(false);

  return (
    <TvFocusable
      onPress={() => router.push(action.href)}
      onFocus={() => {
        setFocused(true);
        onFocus?.();
      }}
      onBlur={() => {
        setFocused(false);
        onBlur?.();
      }}
      railStart={railStart}
      railEnd={railEnd}
      nextFocusUp={nextFocusUp}
      nextFocusDown={nextFocusDown}
      hostRef={hostRef}
      style={[styles.cardPressable, styles.cardSpaced]}
      focusedStyle={styles.cardFocused}
    >
      <LinearGradient
        colors={['#1b1b24', '#1f1f28']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, focused && styles.cardInnerFocused]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, focused && styles.iconWrapFocused]}>
            <Ionicons name={action.icon} size={18} color={colors.brand} />
          </View>
          <Text style={[styles.cardTitle, focused && styles.cardTitleFocused]}>{action.title}</Text>
        </View>
        <Text style={[styles.cardSubtitle, focused && styles.cardSubtitleFocused]}>
          {action.subtitle}
        </Text>
      </LinearGradient>
    </TvFocusable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: isTvUi() ? spacing.md : 32,
  },
  rail: {
    paddingHorizontal: isTvUi() ? 0 : spacing.md,
    paddingTop: isTvUi() ? 8 : 0,
    paddingBottom: isTvUi() ? 10 : spacing.sm,
    gap: isTvUi() ? 10 : 0,
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
    borderWidth: isTvUi() ? tvFocus.borderWidth : 0,
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
    padding: isTvUi() ? 14 : 10,
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
    width: isTvUi() ? 32 : 28,
    height: isTvUi() ? 32 : 28,
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
    fontSize: isTvUi() ? 16 : 14,
    lineHeight: isTvUi() ? 22 : 18,
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
    fontSize: isTvUi() ? 13 : 11,
    lineHeight: isTvUi() ? 18 : 15,
    backgroundColor: 'transparent',
  },
  cardSubtitleFocused: {
    color: colors.brand,
  },
});
