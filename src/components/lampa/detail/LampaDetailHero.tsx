import { ImageBackground, Platform, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { LampaDetail } from '@/api/catalog';
import { DetailLibraryActions } from '@/components/library/DetailLibraryActions';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';
import type { UserListStatus } from '@/lib/libraryStatus';
import {
  lampaAltTitle,
  lampaBackdrop,
  lampaKindLabel,
  lampaRating,
  lampaStatus,
  lampaTitle,
  lampaYear,
  localizedLampaStatus,
} from '@/lib/lampaDetail';

interface LampaDetailHeroProps {
  detail: LampaDetail;
  kind: string;
  isSerial: boolean;
  hasHistory: boolean;
  lastSeason: number;
  lastEpisode: number;
  lastProgress: number;
  userStatus?: string;
  isFavorite?: boolean;
  libraryDisabled?: boolean;
  onWatch: () => void;
  onOpenSources?: () => void;
  onStatusChange: (status: UserListStatus) => void;
  onToggleFavorite: () => void;
}

export function LampaDetailHero({
  detail,
  kind,
  isSerial,
  hasHistory,
  lastSeason,
  lastEpisode,
  lastProgress,
  userStatus,
  isFavorite,
  libraryDisabled,
  onWatch,
  onOpenSources,
  onStatusChange,
  onToggleFavorite,
}: LampaDetailHeroProps) {
  const title = lampaTitle(detail);
  const alt = lampaAltTitle(detail);
  const year = lampaYear(detail);
  const rating = lampaRating(detail);
  const kindLabel = lampaKindLabel(kind);
  const statusLabel = lampaStatus(detail)
    ? localizedLampaStatus(lampaStatus(detail))
    : undefined;
  const backdrop = lampaBackdrop(detail, 'w780');

  const playLabel = hasHistory ? 'Продолжить просмотр' : 'Смотреть сейчас';
  const playHint =
    hasHistory && isSerial
      ? lastProgress > 0 && lastProgress < 1
        ? `S${lastSeason} · E${lastEpisode} · ${Math.round(lastProgress * 100)}%`
        : `S${lastSeason} · E${lastEpisode}`
      : undefined;

  // Genres live in LampaDetailGenres below — keep hero pills to short meta only.
  const pills = [
    kindLabel,
    year ? String(year) : undefined,
    statusLabel,
    rating != null ? rating.toFixed(1) : undefined,
  ].filter(Boolean) as string[];

  return (
    <View style={styles.card}>
      <ImageBackground source={backdrop ? { uri: backdrop } : undefined} style={styles.backdrop}>
        <LinearGradient
          colors={['rgba(19,18,27,0.2)', 'rgba(19,18,27,0.75)', '#13121b']}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(19,18,27,0.9)', 'rgba(19,18,27,0.35)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {alt ? (
            <Text style={styles.alt} numberOfLines={1}>
              {alt}
            </Text>
          ) : null}

          {pills.length > 0 ? (
            <View style={styles.pills}>
              {pills.map((pill) => (
                <View key={pill} style={styles.pill}>
                  <Text style={styles.pillText}>{pill}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.actions}>
            <TvFocusable
              onPress={onWatch}
              hasTVPreferredFocus={Platform.isTV}
              style={styles.playBtn}
            >
              <Text style={styles.playLabel}>▶ {playLabel}</Text>
              {playHint ? <Text style={styles.playHint}>{playHint}</Text> : null}
            </TvFocusable>

            <DetailLibraryActions
              userStatus={userStatus}
              isFavorite={isFavorite}
              disabled={libraryDisabled}
              onStatusChange={onStatusChange}
              onToggleFavorite={onToggleFavorite}
              extraActions={
                isSerial && onOpenSources ? (
                  <TvFocusable onPress={onOpenSources} style={styles.sourcesBtn}>
                    <Text style={styles.sourcesLabel}>Источники</Text>
                  </TvFocusable>
                ) : null
              }
            />
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    minHeight: Platform.isTV ? 340 : 320,
  },
  backdrop: {
    flex: 1,
    minHeight: Platform.isTV ? 340 : 320,
    justifyContent: 'flex-end',
  },
  content: {
    padding: Platform.isTV ? spacing.xxl : spacing.lg,
    gap: spacing.sm,
    maxWidth: Platform.isTV ? 720 : undefined,
  },
  title: {
    color: colors.text,
    fontSize: Platform.isTV ? 32 : 28,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  alt: {
    color: colors.textSecondary,
    fontSize: Platform.isTV ? 18 : 14,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  pill: {
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  playBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brandAccent,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: Platform.isTV ? 16 : 14,
    gap: 4,
  },
  playLabel: {
    color: colors.text,
    fontSize: Platform.isTV ? 20 : 16,
    fontWeight: '700',
  },
  playHint: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  sourcesBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: Platform.isTV ? 14 : 12,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  sourcesLabel: {
    color: colors.text,
    fontSize: Platform.isTV ? 16 : 14,
    fontWeight: '600',
  },
});
