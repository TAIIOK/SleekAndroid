import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { AnimeDetail } from '@/api/catalog';
import { useCountdown } from '@/hooks/useCountdown';
import { isTvUi } from '@/lib/isTvUi';
import {
  countdownUnits,
  formatNextEpisodeDateTime,
  nextEpisodeNumber,
  parseNextEpisodeDate,
  remainingParts,
} from '@/lib/nextEpisode';

interface NextEpisodeCountdownProps {
  detail: AnimeDetail;
  /** Draw a bottom divider when other aside content follows. */
  showDivider?: boolean;
}

export function NextEpisodeCountdown({
  detail,
  showDivider = false,
}: NextEpisodeCountdownProps) {
  const date = useMemo(() => parseNextEpisodeDate(detail), [detail]);
  const dateMs = date?.getTime();
  const remaining = useCountdown(dateMs);
  const startedInFuture = useMemo(
    () => dateMs != null && dateMs > Date.now(),
    [dateMs],
  );

  if (!date || !startedInFuture) return null;

  const expired = remaining <= 0;
  const episodeNo = nextEpisodeNumber(detail.episodesAired);
  const formattedDate = formatNextEpisodeDateTime(date);
  const units = countdownUnits(remainingParts(remaining));

  return (
    <View style={showDivider ? styles.rootDivider : styles.root}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.heading}>Следующая серия</Text>
          <Text style={styles.date} numberOfLines={1}>
            {formattedDate}
          </Text>
        </View>
        {episodeNo != null ? <Text style={styles.episode}>Эп. {episodeNo}</Text> : null}
      </View>

      {expired ? (
        <Text style={styles.expired}>Серия вышла</Text>
      ) : (
        <View
          accessibilityLiveRegion="polite"
          accessibilityLabel={`Через ${units.map((unit) => `${unit.value} ${unit.label}`).join(' ')}`}
          style={styles.timerRow}
        >
          <Text style={styles.through}>Через</Text>
          <View style={styles.units}>
            {units.map((unit) => (
              <View key={unit.label} style={styles.unit}>
                <Text style={styles.unitValue}>{unit.value}</Text>
                <Text style={styles.unitLabel}>{unit.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: isTvUi() ? 10 : 6,
  },
  rootDivider: {
    gap: isTvUi() ? 10 : 6,
    paddingBottom: isTvUi() ? 16 : 10,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexShrink: 1,
    gap: isTvUi() ? 10 : 8,
  },
  heading: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  date: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  episode: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 14,
    fontWeight: '600',
  },
  expired: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isTvUi() ? 12 : 10,
  },
  through: {
    color: '#fff',
    fontSize: isTvUi() ? 18 : 16,
    fontWeight: '700',
  },
  units: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: isTvUi() ? 12 : 10,
  },
  unit: {
    minWidth: isTvUi() ? 36 : 28,
    alignItems: 'center',
  },
  unitValue: {
    color: '#fff',
    fontSize: isTvUi() ? 18 : 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    lineHeight: isTvUi() ? 22 : 20,
  },
  unitLabel: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
