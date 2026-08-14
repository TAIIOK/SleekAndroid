import { Image, StyleSheet, Text, View } from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';
import { resolvePosterUrl } from '@/lib/config';
import type { PartyContent } from '@/types/party';

export function PartyInviteCard({
  title,
  content,
  joining,
  onJoin,
  onLobby,
}: {
  title?: string;
  content?: PartyContent | null;
  joining?: boolean;
  onJoin: () => void;
  onLobby: () => void;
}) {
  const poster = resolvePosterUrl(content?.poster);

  return (
    <View style={styles.card}>
      {poster ? (
        <Image source={{ uri: poster }} style={styles.poster} />
      ) : (
        <View style={[styles.poster, styles.posterFallback]}>
          <Text style={styles.posterLetter}>
            {(title || 'С').trim().slice(0, 1).toUpperCase()}
          </Text>
        </View>
      )}

      <Text style={styles.kicker}>Приглашение в комнату</Text>
      <Text style={styles.title}>{title || 'Совместный просмотр'}</Text>
      {content?.title ? (
        <Text style={styles.content} numberOfLines={2}>
          {content.title}
        </Text>
      ) : null}

      <TvFocusable disabled={joining} onPress={onJoin} style={styles.primary}>
        <Text style={styles.primaryLabel}>
          {joining ? 'Вход…' : 'Присоединиться'}
        </Text>
      </TvFocusable>

      <TvFocusable onPress={onLobby} style={styles.secondary}>
        <Text style={styles.secondaryLabel}>В лобби</Text>
      </TvFocusable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  poster: {
    width: 96,
    height: 136,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: spacing.sm,
  },
  posterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterLetter: {
    color: colors.textSecondary,
    fontWeight: '800',
    fontSize: 28,
  },
  kicker: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  content: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  primary: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radii.md,
    backgroundColor: colors.brandAccent,
    marginTop: spacing.sm,
  },
  primaryLabel: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  secondary: {
    paddingVertical: 10,
  },
  secondaryLabel: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
