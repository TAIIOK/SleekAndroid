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
  lampaGenreNames,
  lampaKindLabel,
  lampaRating,
  lampaStatus,
  lampaTitle,
  lampaYear,
  localizedLampaStatus,
} from '@/lib/lampaDetail';
import { lampaPosterPath } from '@/lib/poster';
import type { CollectionItemInput } from '@/types/collection';

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
  collectionItem?: CollectionItemInput | null;
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
  collectionItem,
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
  const genres = lampaGenreNames(detail.genres).slice(0, 4);

  const playLabel = hasHistory ? 'Продолжить просмотр' : 'Смотреть сейчас';
  const playHint =
    hasHistory && isSerial
      ? lastProgress > 0 && lastProgress < 1
        ? `S${lastSeason} · E${lastEpisode} · ${Math.round(lastProgress * 100)}%`
        : `S${lastSeason} · E${lastEpisode}`
      : undefined;

  // Match AnimeDetailHero: meta + a few genres in the hero card.
  const pills = [
    kindLabel,
    year ? String(year) : undefined,
    statusLabel,
    rating != null ? rating.toFixed(1) : undefined,
    ...genres,
  ].filter(Boolean) as string[];

  const body = (
    <>
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
            contentEntry={Platform.isTV}
            railStart={Platform.isTV}
            style={styles.playBtn}
          >
            <Text style={styles.playLabel}>▶ {playLabel}</Text>
            {playHint ? <Text style={styles.playHint}>{playHint}</Text> : null}
          </TvFocusable>

          <DetailLibraryActions
            userStatus={userStatus}
            isFavorite={isFavorite}
            disabled={libraryDisabled}
            collectionItem={
              collectionItem ?? {
                mediaType: 'lampa',
                mediaId: `${kind === 'home' ? 'tv' : kind}:${detail.id ?? ''}`,
                title: title || undefined,
                poster: lampaPosterPath(detail),
              }
            }
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
    </>
  );

  return (
    <View style={styles.card}>
      {backdrop ? (
        <ImageBackground
          source={{ uri: backdrop }}
          style={styles.backdrop}
          imageStyle={styles.backdropImage}
        >
          {body}
        </ImageBackground>
      ) : (
        <View style={styles.backdrop}>{body}</View>
      )}
    </View>
  );
}

// Keep in sync with AnimeDetailHero — same card density on TV and phone.
const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    alignSelf: 'stretch',
  },
  backdrop: {
    width: '100%',
    minHeight: Platform.isTV ? 260 : 240,
    justifyContent: 'flex-end',
    backgroundColor: colors.bgElevated,
  },
  backdropImage: {
    resizeMode: 'cover',
  },
  content: {
    padding: Platform.isTV ? spacing.lg : spacing.md,
    gap: Platform.isTV ? spacing.sm : 6,
    maxWidth: Platform.isTV ? 720 : undefined,
  },
  title: {
    color: colors.text,
    fontSize: Platform.isTV ? 28 : 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  alt: {
    color: colors.textSecondary,
    fontSize: Platform.isTV ? 15 : 13,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Platform.isTV ? spacing.sm : 6,
    marginTop: spacing.xs,
  },
  pill: {
    borderRadius: radii.pill,
    paddingHorizontal: Platform.isTV ? 12 : 10,
    paddingVertical: Platform.isTV ? 5 : 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pillText: {
    color: colors.textSecondary,
    fontSize: Platform.isTV ? 12 : 11,
    fontWeight: '600',
  },
  actions: {
    marginTop: Platform.isTV ? spacing.sm : 6,
    gap: Platform.isTV ? spacing.sm : 6,
  },
  playBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brandAccent,
    borderRadius: radii.md,
    paddingHorizontal: Platform.isTV ? spacing.xl : spacing.lg,
    paddingVertical: Platform.isTV ? 12 : 11,
    gap: 2,
  },
  playLabel: {
    color: colors.text,
    fontSize: Platform.isTV ? 17 : 15,
    fontWeight: '700',
  },
  playHint: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  sourcesBtn: {
    paddingHorizontal: Platform.isTV ? spacing.lg : spacing.md,
    paddingVertical: Platform.isTV ? 12 : 10,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  sourcesLabel: {
    color: colors.text,
    fontSize: Platform.isTV ? 15 : 13,
    fontWeight: '600',
  },
});
