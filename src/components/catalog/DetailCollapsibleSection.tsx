import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PosterRail, type RailItem } from '@/components/catalog/PosterRail';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, layout, radii, spacing } from '@/constants/aniverse';
import { isTvUi } from '@/lib/isTvUi';

interface DetailCollapsibleSectionProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  loading?: boolean;
  empty?: boolean;
  children?: ReactNode;
}

export function DetailCollapsibleSection({
  title,
  expanded,
  onToggle,
  loading = false,
  empty = false,
  children,
}: DetailCollapsibleSectionProps) {
  return (
    <View style={styles.section}>
      <TvFocusable
        onPress={onToggle}
        railStart
        accessibilityLabel={expanded ? `${title}, свернуть` : `${title}, раскрыть`}
        style={styles.header}
        focusedStyle={styles.headerFocused}
      >
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-down' : 'chevron-forward'}
          size={isTvUi() ? 20 : 16}
          color={colors.brand}
        />
      </TvFocusable>
      {expanded ? (
        loading ? (
          <Text style={styles.meta}>Загрузка…</Text>
        ) : empty ? (
          <Text style={styles.meta}>Нет данных</Text>
        ) : (
          children
        )
      ) : null}
    </View>
  );
}

interface DetailCollapsibleRailProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  items: RailItem[];
  loading?: boolean;
  fetched?: boolean;
  onItemPress: (item: RailItem) => void;
}

export function DetailCollapsibleRail({
  title,
  expanded,
  onToggle,
  items,
  loading = false,
  fetched = false,
  onItemPress,
}: DetailCollapsibleRailProps) {
  const pending = items.length === 0 && (loading || !fetched);
  return (
    <DetailCollapsibleSection
      title={title}
      expanded={expanded}
      onToggle={onToggle}
      loading={expanded && pending}
      empty={expanded && items.length === 0 && fetched}
    >
      <PosterRail
        title={title}
        items={items}
        loading={loading}
        itemWidth={layout.posterWidthDetail}
        flush
        hideTitle
        onItemPress={onItemPress}
      />
    </DetailCollapsibleSection>
  );
}

const styles = StyleSheet.create({
  section: {
    width: '100%',
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderRadius: radii.md,
    paddingHorizontal: isTvUi() ? spacing.md : spacing.sm,
    paddingVertical: isTvUi() ? spacing.sm : 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerFocused: {
    borderColor: colors.brand,
  },
  title: {
    color: colors.brand,
    fontSize: isTvUi() ? 22 : 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: isTvUi() ? 14 : 13,
  },
});
