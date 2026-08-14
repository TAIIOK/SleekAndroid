import { Image, StyleSheet, Text, View } from 'react-native';

import { PartyMemberAvatar } from '@/components/party/PartyMemberAvatar';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';
import { resolvePosterUrl } from '@/lib/config';
import type { PartyRoom } from '@/types/party';

function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function PartyRoomCard({
  room,
  onOpen,
  onLeave,
  leaving,
  label = 'Открыть',
}: {
  room: PartyRoom;
  onOpen: () => void;
  onLeave?: () => void;
  leaving?: boolean;
  label?: string;
}) {
  const poster = resolvePosterUrl(room.content?.poster);
  const playing = !!room.playback?.isPlaying;
  const current = Math.max(0, room.playback?.playbackTimeSec ?? 0);
  const duration =
    typeof room.playback?.durationSec === 'number' && room.playback.durationSec > 0
      ? room.playback.durationSec
      : 0;
  const progress = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;
  const remaining = duration > 0 ? Math.max(0, duration - current) : 0;
  const hasPlayback = room.playback != null && typeof room.playback.playbackTimeSec === 'number';

  return (
    <View style={styles.card}>
      {poster ? (
        <Image source={{ uri: poster }} style={styles.poster} />
      ) : (
        <View style={[styles.poster, styles.posterFallback]}>
          <Text style={styles.posterLetter}>
            {(room.title || 'К').trim().slice(0, 1).toUpperCase()}
          </Text>
        </View>
      )}

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {room.content?.title || room.title || 'Комната'}
        </Text>
        <View style={styles.chips}>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>{room.memberCount ?? 0} уч.</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>{room.isPrivate ? 'Приватная' : 'Публичная'}</Text>
          </View>
          {hasPlayback ? (
            <View style={[styles.chip, playing ? styles.chipLive : styles.chipPaused]}>
              <Text style={[styles.chipLabel, styles.chipLabelEmphasis]}>
                {playing ? 'Смотрят' : 'На паузе'}
              </Text>
            </View>
          ) : null}
        </View>
        {room.content?.title && room.title ? (
          <Text style={styles.content} numberOfLines={1}>
            {room.title}
          </Text>
        ) : null}

        {hasPlayback ? (
          <View style={styles.progressBlock}>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${progress}%` }]} />
            </View>
            <View style={styles.times}>
              <Text style={styles.time}>{formatClock(current)}</Text>
              {duration > 0 ? (
                <Text style={styles.time}>−{formatClock(remaining)}</Text>
              ) : (
                <Text style={styles.time}>{playing ? 'в эфире' : 'пауза'}</Text>
              )}
            </View>
          </View>
        ) : null}

        {room.owner ? (
          <View style={styles.owner}>
            <PartyMemberAvatar
              nickname={room.owner.nickname}
              avatar={room.owner.avatar}
              size="sm"
            />
            <Text style={styles.ownerName} numberOfLines={1}>
              {room.owner.nickname}
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <TvFocusable onPress={onOpen} style={styles.cta}>
            <Text style={styles.ctaLabel}>{label}</Text>
          </TvFocusable>
          {onLeave ? (
            <TvFocusable
              disabled={leaving}
              onPress={onLeave}
              style={styles.leaveBtn}
            >
              <Text style={styles.leaveLabel}>{leaving ? '…' : 'Покинуть'}</Text>
            </TvFocusable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  poster: {
    width: 52,
    height: 74,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  posterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterLetter: {
    color: colors.textSecondary,
    fontWeight: '800',
    fontSize: 18,
  },
  body: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    height: 22,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  chipLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    textAlign: 'center',
    includeFontPadding: false,
  },
  chipLabelEmphasis: {
    color: colors.text,
  },
  chipLive: {
    backgroundColor: 'rgba(79,70,229,0.45)',
  },
  chipPaused: {
    backgroundColor: 'rgba(251,191,36,0.25)',
  },
  content: {
    color: colors.textMuted,
    fontSize: 12,
  },
  progressBlock: {
    marginTop: 4,
    gap: 4,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.brandAccent,
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: {
    color: colors.textMuted,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  owner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  ownerName: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: 6,
  },
  cta: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: 'rgba(79,70,229,0.35)',
  },
  ctaLabel: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  leaveBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
  },
  leaveLabel: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 13,
  },
});
