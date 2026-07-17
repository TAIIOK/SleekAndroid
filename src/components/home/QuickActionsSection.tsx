import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, layout, radii, spacing } from '@/constants/aniverse';

export interface QuickActionCounts {
  bookmarks: number;
  lists: number;
  collections: number;
  history: number;
}

interface QuickActionsSectionProps {
  counts: QuickActionCounts;
}

const actions = [
  {
    key: 'bookmarks' as const,
    title: 'Закладки',
    icon: 'bookmark' as const,
    href: '/library/bookmarks',
    subtitle: (n: number) => (n === 0 ? 'Пусто' : itemsLabel(n)),
  },
  {
    key: 'lists' as const,
    title: 'Мои списки',
    icon: 'list' as const,
    href: '/library/lists',
    subtitle: (n: number) => (n === 0 ? 'Пусто' : 'Персональные подборки'),
  },
  {
    key: 'collections' as const,
    title: 'Коллекции',
    icon: 'albums' as const,
    href: '/library/collections',
    subtitle: (n: number) => (n === 0 ? 'Пусто' : itemsLabel(n)),
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

export function QuickActionsSection({ counts }: QuickActionsSectionProps) {
  if (Platform.isTV) return null;

  const actionByKey = Object.fromEntries(actions.map((action) => [action.key, action])) as Record<
    (typeof actions)[number]['key'],
    (typeof actions)[number]
  >;

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
                  count={counts[key]}
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
}: {
  action: (typeof actions)[number];
  count: number;
}) {
  const router = useRouter();
  const enabled = action.key === 'history' || action.key === 'lists' || count > 0;

  const inner = (
    <>
      <View style={styles.cardHeader}>
        <View style={styles.iconWrap}>
          <Ionicons name={action.icon} size={14} color={colors.brand} />
        </View>
        <Text style={styles.cardTitle}>{action.title}</Text>
      </View>
      <Text style={styles.cardSubtitle}>{action.subtitle(count)}</Text>
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
      onPress={() => router.push(action.href as '/')}
      style={[styles.cardPressable, !enabled && styles.cardDisabled]}
    >
      <LinearGradient
        colors={['#1b1b24', '#1f1f28']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {inner}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 32,
  },
  rail: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
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
  },
  card: {
    flex: 1,
    width: layout.quickActionCardWidth,
    height: layout.quickActionCardHeight,
    borderRadius: radii.quickAction,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 10,
    justifyContent: 'space-between',
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
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    flex: 1,
    backgroundColor: 'transparent',
  },
  cardSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    backgroundColor: 'transparent',
  },
});
