import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CatalogPosterCard } from '@/components/catalog/CatalogPosterCard';
import { colors, layout, spacing } from '@/constants/aniverse';
import { useTvRailFocusRestore } from '@/hooks/useTvRailFocusRestore';
import { historyContentKey, type WatchHistoryItem } from '@/lib/history';
import { isTvUi } from '@/lib/isTvUi';
import {
  tvHorizontalCatalogScrollProps,
  tvRailSectionSnapProps,
} from '@/lib/tvCatalogScroll';

interface HistoryDateRailProps {
  title: string;
  items: WatchHistoryItem[];
  onItemPress: (item: WatchHistoryItem) => void;
  /** First rail on the screen — first poster is the TV content entry. */
  contentEntryRail?: boolean;
}

export function HistoryDateRail({
  title,
  items,
  onItemPress,
  contentEntryRail = false,
}: HistoryDateRailProps) {
  const { bindItem } = useTvRailFocusRestore(items.length);
  const horizontalPad = isTvUi() ? layout.gutterDesktop : layout.gutterMobile;

  if (!items.length) return null;

  return (
    <View style={styles.section} {...tvRailSectionSnapProps}>
      <Text style={[styles.title, { paddingHorizontal: horizontalPad }]}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.rail, { paddingHorizontal: horizontalPad }]}
        {...tvHorizontalCatalogScrollProps}
      >
        {items.map((item, index) => {
          const railFocus = bindItem(index);
          return (
            <View key={historyContentKey(item)} collapsable={false}>
              <CatalogPosterCard
                ref={railFocus.ref}
                title={item.title}
                poster={item.poster}
                subtitle={
                  item.progressPercent != null ? `${item.progressPercent}%` : undefined
                }
                onPress={() => onItemPress(item)}
                onFocus={railFocus.onFocus}
                onBlur={railFocus.onBlur}
                variant="rail"
                railStart={index === 0}
                contentEntry={contentEntryRail && index === 0}
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  rail: {
    // Extra vertical room so TV focus rings are not clipped by ScrollView.
    paddingTop: isTvUi() ? 8 : 0,
    paddingBottom: isTvUi() ? 10 : spacing.xs,
    gap: isTvUi() ? 10 : 12,
  },
});
