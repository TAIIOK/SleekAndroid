import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, layout, radii, spacing, tvFocus, typography } from '@/constants/aniverse';

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
  if (Platform.isTV) return spacing.md;
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
}: SectionHeaderProps) {
  const accentVisible =
    showAccent ?? (Platform.isTV || variant === 'rail-featured' || Boolean(onSeeAll));

  const titleText = (
    <Text style={[styles.title, titleStyleForVariant(variant)]}>{title}</Text>
  );

  const titleBlock = (
    <View style={styles.titleBlock}>
      {tvFocusEntry && Platform.isTV ? (
        <TvFocusable
          hasTVPreferredFocus
          contentEntry
          railStart
          style={styles.titleFocus}
          focusedStyle={styles.titleFocused}
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
        <Pressable onPress={onSeeAll} style={styles.seeAll}>
          <Text style={styles.seeAllText}>{seeAllLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Platform.isTV ? layout.gutterDesktop : layout.gutterMobile,
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
    width: Platform.isTV ? 32 : 48,
    height: Platform.isTV ? 4 : 6,
    borderRadius: 999,
    backgroundColor: colors.brand,
    marginTop: spacing.xs,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: Platform.isTV ? 12 : 14,
    backgroundColor: 'transparent',
  },
  seeAll: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.glass,
    borderRadius: 999,
    paddingHorizontal: Platform.isTV ? 16 : 24,
    paddingVertical: Platform.isTV ? 8 : 10,
    marginBottom: 2,
  },
  seeAllText: {
    color: colors.brand,
    ...typography.labelCaps,
  },
});
