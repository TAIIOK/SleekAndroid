import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/aniverse';
import { formatWatchTime } from '@/lib/format';
import {
  formatPercent,
  libraryStatusBarRows,
  type LibraryAnalytics,
} from '@/lib/libraryAnalytics';
import { MY_LISTS_STATUS_LABELS } from '@/lib/myLists';

export function LibraryAnalyticsSection({ analytics }: { analytics: LibraryAnalytics }) {
  const rows = libraryStatusBarRows(analytics.byStatus);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Аналитика</Text>
      <View style={styles.grid}>
        <Stat label="Всего" value={String(analytics.total)} />
        <Stat label="Избранное" value={String(analytics.favorites)} />
        <Stat label="Коллекции" value={String(analytics.collections)} />
        <Stat label="Досмотрено" value={formatPercent(analytics.completionRate)} />
        <Stat label="Смотрю" value={formatPercent(analytics.watchingShare)} />
        <Stat label="Время" value={formatWatchTime(analytics.watchSeconds)} />
      </View>
      <View style={styles.bars}>
        {rows.map((row) => (
          <View key={row.status} style={styles.barRow}>
            <Text style={styles.barLabel}>{MY_LISTS_STATUS_LABELS[row.status]}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.max(row.ratio * 100, 2)}%` }]} />
            </View>
            <Text style={styles.barCount}>{row.count}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  title: { color: colors.text, fontWeight: '800', fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: {
    minWidth: '30%',
    flexGrow: 1,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  statValue: { color: colors.text, fontWeight: '800', fontSize: 16 },
  statLabel: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  bars: { gap: spacing.sm },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabel: { width: 90, color: colors.textSecondary, fontSize: 12 },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: colors.brand },
  barCount: { width: 28, color: colors.text, fontSize: 12, textAlign: 'right' },
});
