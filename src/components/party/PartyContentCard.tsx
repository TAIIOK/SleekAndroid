import { Image, StyleSheet, Text, View } from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';
import { resolvePosterUrl } from '@/lib/config';
import type { PartyContent } from '@/types/party';

function episodeLabel(content: PartyContent): string | null {
  if (content.season != null && content.episode != null) {
    return `S${content.season} · E${content.episode}`;
  }
  if (content.episode != null) {
    return `Эпизод ${content.episode}`;
  }
  return null;
}

export function PartyContentCard({
  content,
  playing,
  playbackLabel,
  onPress,
  onOpen,
}: {
  content: PartyContent | null | undefined;
  playing?: boolean;
  playbackLabel?: string;
  onPress?: () => void;
  /** Primary CTA — usually opens the title / player. */
  onOpen?: () => void;
}) {
  if (!content?.title) {
    return (
      <View style={styles.heroEmpty}>
        <View style={styles.emptyIcon}>
          <Text style={styles.emptyIconText}>▶</Text>
        </View>
        <Text style={styles.emptyTitle}>Контент ещё не выбран</Text>
        <Text style={styles.emptyHint}>
          Откройте тайтл из каталога и начните просмотр — комната подхватит синхронизацию
        </Text>
      </View>
    );
  }

  const poster = resolvePosterUrl(content.poster);
  const meta = episodeLabel(content);

  return (
    <View style={styles.hero}>
      <TvFocusable
        disabled={!onPress}
        onPress={onPress}
        style={styles.posterWrap}
      >
        {poster ? (
          <Image source={{ uri: poster }} style={styles.poster} />
        ) : (
          <View style={[styles.poster, styles.posterFallback]}>
            <Text style={styles.posterLetter}>
              {content.title.trim().slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        {playing ? (
          <View style={styles.liveBadge}>
            <Text style={styles.liveLabel}>Смотрят</Text>
          </View>
        ) : null}
      </TvFocusable>

      <View style={styles.body}>
        <Text style={styles.kicker}>Сейчас смотрим</Text>
        <Text style={styles.title} numberOfLines={3}>
          {content.title}
        </Text>
        {(meta || playbackLabel) && (
          <Text style={styles.meta} numberOfLines={1}>
            {[meta, playbackLabel].filter(Boolean).join(' · ')}
          </Text>
        )}

        {onOpen ? (
          <TvFocusable onPress={onOpen} style={styles.openBtn}>
            <Text style={styles.openLabel}>Открыть</Text>
          </TvFocusable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  posterWrap: {
    position: 'relative',
  },
  poster: {
    width: 110,
    height: 156,
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
    fontSize: 28,
  },
  liveBadge: {
    position: 'absolute',
    left: 8,
    top: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(79,70,229,0.9)',
  },
  liveLabel: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '800',
  },
  body: {
    flex: 1,
    gap: 4,
    minWidth: 0,
    justifyContent: 'center',
  },
  kicker: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 18,
    lineHeight: 24,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  openBtn: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.brandAccent,
  },
  openLabel: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  heroEmpty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(79,70,229,0.25)',
    marginBottom: 4,
  },
  emptyIconText: {
    color: colors.text,
    fontSize: 18,
    marginLeft: 2,
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 16,
    textAlign: 'center',
  },
  emptyHint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
