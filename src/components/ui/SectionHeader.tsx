import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, layout, radii, spacing, tvFocus, typography } from '@/constants/aniverse';
import { useTvCatalogVerticalSnapshot } from '@/hooks/useTvCatalogVerticalNeighbors';
import { isTvUi } from '@/lib/isTvUi';
import { registerTvCatalogChrome } from '@/lib/tvCatalogVerticalFocus';

export type SectionHeaderVariant = 'continue' | 'quick' | 'group' | 'rail' | 'rail-featured';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  seeAllLabel?: string;
  onSeeAll?: () => void;
  variant?: SectionHeaderVariant;
  showAccent?: boolean;
  /** Skip horizontal gutter — use inside already-padded screens (detail, sheets). */
  flush?: boolean;
  /**
   * TV browse pages: title is the content focus entry (Left→sidebar, preferred focus).
   * No separate chip — focus ring sits on the page title itself.
   */
  tvFocusEntry?: boolean;
  /** Catalog path for vertical D-pad handoff (`/anime`, `/movies`, `/series`). */
  tvFocusPath?: string;
}

function titleStyleForVariant(variant: SectionHeaderVariant) {
  switch (variant) {
    case 'continue':
      return typography.homeContinueTitle;
    case 'quick':
      return typography.homeQuickTitle;
    case 'group':
      return typography.homeGroupTitle;
    case 'rail':
    case 'rail-featured':
    default:
      return typography.railTitle;
  }
}

function marginBottomForVariant(variant: SectionHeaderVariant) {
  if (isTvUi()) return spacing.md;
  if (variant === 'group') return spacing.sm;
  return 12;
}

export function SectionHeader({
  title,
  subtitle,
  seeAllLabel = 'Смотреть все',
  onSeeAll,
  variant = 'rail',
  showAccent,
  flush = false,
  tvFocusEntry = false,
  tvFocusPath,
}: SectionHeaderProps) {
  const firstRailTag = useTvCatalogVerticalSnapshot(tvFocusPath).rails[0]?.tag;
  const accentVisible =
    showAccent ?? (isTvUi() || variant === 'rail-featured' || Boolean(onSeeAll));

  const titleText = (
    <Text style={[styles.title, titleStyleForVariant(variant)]}>{title}</Text>
  );

  const titleBlock = (
    <View style={styles.titleBlock}>
      {tvFocusEntry && isTvUi() ? (
        <TvFocusable
          hasTVPreferredFocus
          contentEntry
          railStart
          style={styles.titleFocus}
          focusedStyle={styles.titleFocused}
          hostRef={
            tvFocusPath
              ? (node) => registerTvCatalogChrome(tvFocusPath, node, 'primary')
              : undefined
          }
          nextFocusDown={firstRailTag}
        >
          {titleText}
        </TvFocusable>
      ) : (
        titleText
      )}
      {accentVisible ? <View style={styles.accent} /> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );

  return (
    <View
      style={[
        styles.wrap,
        flush && styles.wrapFlush,
        { marginBottom: marginBottomForVariant(variant) },
      ]}
    >
      {titleBlock}
      {onSeeAll ? (
        <TvFocusable
          onPress={onSeeAll}
          style={styles.seeAll}
          focusedStyle={styles.seeAllFocused}
        >
          <Text style={styles.seeAllText}>{seeAllLabel}</Text>
        </TvFocusable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: isTvUi() ? layout.gutterDesktop : layout.gutterMobile,
    gap: spacing.md,
  },
  wrapFlush: {
    paddingHorizontal: 0,
  },
  titleBlock: {
    flexGrow: 1,
    flexShrink: 1,
    gap: spacing.xs,
    backgroundColor: 'transparent',
  },
  // Hug the title text — not the full header row.
  titleFocus: {
    alignSelf: 'flex-start',
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  titleFocused: {
    borderColor: tvFocus.borderColor,
    backgroundColor: tvFocus.fill,
  },
  title: {
    color: colors.text,
    backgroundColor: 'transparent',
  },
  accent: {
    width: isTvUi() ? 32 : 48,
    height: isTvUi() ? 4 : 6,
    borderRadius: 999,
    backgroundColor: colors.brand,
    marginTop: spacing.xs,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: isTvUi() ? 12 : 14,
    backgroundColor: 'transparent',
  },
  seeAll: {
    borderWidth: tvFocus.borderWidth,
    borderColor: colors.borderLight,
    backgroundColor: colors.glass,
    borderRadius: 999,
    paddingHorizontal: isTvUi() ? 16 : 24,
    paddingVertical: isTvUi() ? 8 : 10,
    marginBottom: 2,
  },
  seeAllFocused: {
    borderColor: tvFocus.borderColor,
    backgroundColor: tvFocus.fill,
    transform: [{ scale: 1.06 }],
  },
  seeAllText: {
    color: colors.brand,
    ...typography.labelCaps,
  },
});
