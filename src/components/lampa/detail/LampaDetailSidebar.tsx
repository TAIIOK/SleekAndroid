import { Platform, StyleSheet, Text, View } from 'react-native';

import type { LampaDetail } from '@/api/catalog';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { colors, spacing } from '@/constants/aniverse';
import { buildLampaInfoRows, lampaRating } from '@/lib/lampaDetail';

interface LampaDetailSidebarProps {
  detail: LampaDetail;
  isSerial: boolean;
}

export function LampaDetailSidebar({ detail, isSerial }: LampaDetailSidebarProps) {
  const rows = buildLampaInfoRows(detail, isSerial);
  const rating = lampaRating(detail);
  const hasRating = rating != null && !rows.some((row) => row.title === 'Рейтинг');

  if (!rows.length && !hasRating) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Информация</Text>
      <GlassSurface rounded="lg" style={styles.block}>
        {rows.map((row) => (
          <View key={row.title} style={styles.metaRow}>
            <Text style={styles.metaLabel}>{row.title}</Text>
            <Text style={styles.metaValue}>{row.value}</Text>
          </View>
        ))}
        {hasRating ? (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Рейтинг</Text>
            <Text style={styles.metaValue}>{rating!.toFixed(1)}</Text>
          </View>
        ) : null}
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: '100%',
    gap: spacing.sm,
  },
  title: {
    color: colors.brand,
    fontSize: Platform.isTV ? 22 : 18,
    fontWeight: '700',
  },
  block: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  metaLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    flexShrink: 0,
  },
  metaValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    flexShrink: 1,
  },
});
