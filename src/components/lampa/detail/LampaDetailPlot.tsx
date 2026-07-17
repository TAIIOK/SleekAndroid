import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import type { LampaDetail } from '@/api/catalog';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, spacing } from '@/constants/aniverse';

interface LampaDetailPlotProps {
  detail: LampaDetail;
}

export function LampaDetailPlot({ detail }: LampaDetailPlotProps) {
  const [expanded, setExpanded] = useState(false);
  const desc = (detail.overview ?? detail.description)?.trim() ?? '';
  const limit = 420;
  const needsExpand = desc.length > limit;
  const cut = desc.lastIndexOf(' ', limit);
  const displayText =
    !needsExpand || expanded
      ? desc
      : `${desc.slice(0, cut > 0 ? cut : limit).trim()}…`;

  if (!desc) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Сюжет</Text>
      <Text style={styles.body}>{displayText}</Text>
      {needsExpand ? (
        <TvFocusable onPress={() => setExpanded((v) => !v)} style={styles.more}>
          <Text style={styles.moreLabel}>{expanded ? 'Свернуть' : 'Подробнее'}</Text>
        </TvFocusable>
      ) : null}
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
    marginBottom: spacing.xs,
  },
  body: {
    color: colors.textSecondary,
    fontSize: Platform.isTV ? 16 : 14,
    lineHeight: Platform.isTV ? 26 : 22,
  },
  more: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  moreLabel: {
    color: colors.brand,
    fontSize: 14,
    fontWeight: '700',
  },
});
