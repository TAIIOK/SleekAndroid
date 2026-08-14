import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';
import type { PartyRoom } from '@/types/party';

function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/** Banner for the currently active party session on the lobby screen. */
export function PartyActiveSessionBanner({
  room,
  onOpen,
  onLeave,
  leaving,
}: {
  room: PartyRoom;
  onOpen: () => void;
  onLeave: () => void;
  leaving?: boolean;
}) {
  const playing = !!room.playback?.isPlaying;
  const current = Math.max(0, room.playback?.playbackTimeSec ?? 0);
  const title = room.content?.title || room.title || 'Комната';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.statusPill, playing ? styles.statusLive : styles.statusPaused]}>
          <View style={[styles.dot, playing ? styles.dotLive : styles.dotPaused]} />
          <Text style={styles.statusLabel}>{playing ? 'Смотрят' : 'На паузе'}</Text>
        </View>
        {room.playback ? (
          <Text style={styles.clock}>{formatClock(current)}</Text>
        ) : null}
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        Активная сессия
        {room.joinCode ? ` · код ${room.joinCode}` : ''}
        {` · ${room.memberCount ?? 0} уч.`}
      </Text>

      <View style={styles.actions}>
        <TvFocusable onPress={onOpen} style={styles.openBtn}>
          <Ionicons name="play" size={16} color={colors.text} />
          <Text style={styles.openLabel}>Вернуться</Text>
        </TvFocusable>
        <TvFocusable disabled={leaving} onPress={onLeave} style={styles.leaveBtn}>
          <Ionicons name="exit-outline" size={16} color={colors.danger} />
          <Text style={styles.leaveLabel}>{leaving ? '…' : 'Покинуть'}</Text>
        </TvFocusable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(79,70,229,0.45)',
    backgroundColor: 'rgba(79,70,229,0.12)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 24,
    borderRadius: radii.pill,
  },
  statusLive: {
    backgroundColor: 'rgba(52,211,153,0.18)',
  },
  statusPaused: {
    backgroundColor: 'rgba(251,191,36,0.18)',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotLive: { backgroundColor: '#34d399' },
  dotPaused: { backgroundColor: '#fbbf24' },
  statusLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
    textAlign: 'center',
    includeFontPadding: false,
  },
  clock: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 4,
  },
  openBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.brandAccent,
  },
  openLabel: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)',
  },
  leaveLabel: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 14,
  },
});
