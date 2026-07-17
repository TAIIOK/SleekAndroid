import { ImageBackground, Platform, StyleSheet, Text, View } from 'react-native';
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
import type { AnimeEpisode } from '@aniverse/types';

interface AnimeDetailHeroProps {
  detail: AnimeDetail;
  resumeEpisode: AnimeEpisode | null;
  resumeLoading?: boolean;
  hasHistory: boolean;
  lastProgress?: number;
  userStatus?: string;
  isFavorite?: boolean;
  libraryDisabled?: boolean;
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
  const playDisabled = resumeLoading || !resumeEpisode;

  const playLabel = hasHistory
    ? 'Продолжить просмотр'
    : resumeLoading && !resumeEpisode
      ? 'Загрузка…'
      : 'Смотреть сейчас';

  const playHint =
    hasHistory && resumeEpisode && lastProgress > 0 && lastProgress < 1
      ? `Эп. ${episodeNumber(resumeEpisode)} · ${Math.round(lastProgress * 100)}%`
      : hasHistory && resumeEpisode
        ? `Эп. ${episodeNumber(resumeEpisode)}`
        : undefined;

  const pills = [
    typeLabel,
    detail.year ? String(detail.year) : undefined,
    status,
    detail.ageRating,
    score != null ? score.toFixed(1) : undefined,
    ...genres,
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
              disabled={playDisabled}
              onPress={onPlay}
              hasTVPreferredFocus={Platform.isTV}
              style={[styles.playBtn, playDisabled && styles.playDisabled]}
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
    minHeight: Platform.isTV ? 420 : 320,
  },
  backdrop: {
    flex: 1,
    minHeight: Platform.isTV ? 420 : 320,
    justifyContent: 'flex-end',
  },
  content: {
    padding: Platform.isTV ? spacing.xxl : spacing.lg,
    gap: spacing.sm,
    maxWidth: Platform.isTV ? 720 : undefined,
  },
  title: {
    color: colors.text,
    fontSize: Platform.isTV ? 42 : 28,
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
  playDisabled: {
    opacity: 0.5,
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
});
