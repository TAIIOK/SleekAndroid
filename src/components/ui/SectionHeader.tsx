import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, layout, spacing, typography } from '@/constants/aniverse';

export type SectionHeaderVariant = 'continue' | 'quick' | 'group' | 'rail' | 'rail-featured';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  seeAllLabel?: string;
  onSeeAll?: () => void;
  variant?: SectionHeaderVariant;
  showAccent?: boolean;
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
}: SectionHeaderProps) {
  const accentVisible =
    showAccent ?? (Platform.isTV || variant === 'rail-featured' || Boolean(onSeeAll));

  return (
    <View style={[styles.wrap, { marginBottom: marginBottomForVariant(variant) }]}>
      <View style={styles.titleBlock}>
        <Text style={[styles.title, titleStyleForVariant(variant)]}>{title}</Text>
        {accentVisible ? <View style={styles.accent} /> : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
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
  titleBlock: {
    flex: 1,
    gap: spacing.xs,
    backgroundColor: 'transparent',
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
