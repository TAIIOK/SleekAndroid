import {
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { AnimeDetail } from '@/api/catalog';
import { DetailLibraryActions } from '@/components/library/DetailLibraryActions';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';
import {
  animeAltTitle,
  animeGenreNames,
  animeHeroImageCandidates,
  animeScore,
  episodeNumber,
  localizedAnimeStatus,
  localizedAnimeType,
} from '@/lib/animeDetail';
import { resolveAnimePosterUrl } from '@/lib/config';
import type { UserListStatus } from '@/lib/libraryStatus';
import { animePoster } from '@/lib/poster';
import type { CollectionItemInput } from '@/types/collection';
import type { AnimeEpisode } from '@aniverse/types';
import { isTvUi } from '@/lib/isTvUi';

interface AnimeDetailHeroProps {
  detail: AnimeDetail;
  resumeEpisode: AnimeEpisode | null;
  resumeLoading?: boolean;
  hasHistory: boolean;
  lastProgress?: number;
  userStatus?: string;
  isFavorite?: boolean;
  libraryDisabled?: boolean;
  collectionItem?: CollectionItemInput | null;
  onPlay: () => void;
  onStatusChange: (status: UserListStatus) => void;
  onToggleFavorite: () => void;
}

export function AnimeDetailHero({
  detail,
  resumeEpisode,
  resumeLoading = false,
  hasHistory,
  lastProgress = 0,
  userStatus,
  isFavorite,
  libraryDisabled,
  collectionItem,
  onPlay,
  onStatusChange,
  onToggleFavorite,
}: AnimeDetailHeroProps) {
  const title = detail.title ?? 'Аниме';
  const alt = animeAltTitle(detail);
  const score = animeScore(detail);
  const typeLabel = localizedAnimeType(detail.type);
  const status = detail.status ? localizedAnimeStatus(detail.status) : undefined;
  const genres = animeGenreNames(detail.genres).slice(0, 4);
  const backdrop = resolveAnimePosterUrl(animeHeroImageCandidates(detail)[0]);
  const canPlay = Boolean(resumeEpisode) && !resumeLoading;

  const playLabel = hasHistory
    ? 'Продолжить просмотр'
    : resumeLoading && !resumeEpisode
      ? 'Загрузка…'
      : 'Смотреть сейчас';

  const playHint =
    hasHistory && resumeEpisode && lastProgress > 0 && lastProgress < 1
      ? `${episodeNumber(resumeEpisode)} Эпизод · ${Math.round(lastProgress * 100)}%`
      : hasHistory && resumeEpisode
        ? `${episodeNumber(resumeEpisode)} Эпизод`
        : undefined;

  const pills = [
    typeLabel,
    detail.year ? String(detail.year) : undefined,
    status,
    detail.ageRating,
    score != null ? score.toFixed(1) : undefined,
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
            onPress={() => {
              if (canPlay) onPlay();
            }}
            hasTVPreferredFocus={isTvUi()}
            contentEntry={isTvUi()}
            railStart={isTvUi()}
            style={[styles.playBtn, !canPlay && styles.playDisabled]}
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
                mediaType: 'anime',
                mediaId: String(detail.id),
                title: detail.title ?? undefined,
                poster: animePoster(detail),
              }
            }
            onStatusChange={onStatusChange}
            onToggleFavorite={onToggleFavorite}
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

const HERO_MIN = isTvUi() ? 260 : 240;

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    alignSelf: 'stretch',
    width: '100%',
    // Fixed floor so a missing poster cannot collapse or flex-expand the page.
    minHeight: HERO_MIN,
  },
  backdrop: {
    width: '100%',
    minHeight: HERO_MIN,
    justifyContent: 'flex-end',
    backgroundColor: colors.bgElevated,
  },
  backdropImage: {
    resizeMode: 'cover',
  },
  content: {
    padding: isTvUi() ? spacing.lg : spacing.md,
    gap: isTvUi() ? spacing.sm : 6,
    maxWidth: isTvUi() ? 720 : undefined,
  },
  title: {
    color: colors.text,
    fontSize: isTvUi() ? 28 : 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  alt: {
    color: colors.textSecondary,
    fontSize: isTvUi() ? 15 : 13,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isTvUi() ? spacing.sm : 6,
    marginTop: spacing.xs,
  },
  pill: {
    borderRadius: radii.pill,
    paddingHorizontal: isTvUi() ? 12 : 10,
    paddingVertical: isTvUi() ? 5 : 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pillText: {
    color: colors.textSecondary,
    fontSize: isTvUi() ? 12 : 11,
    fontWeight: '600',
  },
  actions: {
    marginTop: isTvUi() ? spacing.sm : 6,
    gap: isTvUi() ? spacing.sm : 6,
  },
  playBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brandAccent,
    borderRadius: radii.md,
    paddingHorizontal: isTvUi() ? spacing.xl : spacing.lg,
    paddingVertical: isTvUi() ? 12 : 11,
    gap: 2,
  },
  playDisabled: {
    opacity: 0.55,
  },
  playLabel: {
    color: colors.text,
    fontSize: isTvUi() ? 17 : 15,
    fontWeight: '700',
  },
  playHint: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
