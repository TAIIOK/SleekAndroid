import { Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';
import {
  episodeLabel,
  episodeNumber,
  episodeThumbnail,
  hasPlayableVideo,
  isRedundantEpisodeTitle,
} from '@/lib/animeDetail';
import { resolveAnimePosterUrl } from '@/lib/config';
import type { AnimeEpisode } from '@aniverse/types';

const CARD_WIDTH = Platform.isTV ? 176 : 168;

interface AnimeDetailEpisodesProps {
  episodes: AnimeEpisode[];
  isLoading?: boolean;
  isFetchingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  progressByEpisodeId?: Record<number, number>;
  onPlay: (episode: AnimeEpisode) => void;
}

export function AnimeDetailEpisodes({
  episodes,
  isLoading,
  isFetchingMore,
  hasMore,
  onLoadMore,
  progressByEpisodeId = {},
  onPlay,
}: AnimeDetailEpisodesProps) {
  if (isLoading && !episodes.length) {
    return (
      <View style={styles.section}>
        <Text style={styles.title}>Сезоны и серии</Text>
        <Text style={styles.meta}>Загрузка эпизодов…</Text>
      </View>
    );
  }

  if (!episodes.length) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Сезоны и серии</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        {episodes.map((episode) => {
          const progress = progressByEpisodeId[episode.id] ?? 0;
          const playable = hasPlayableVideo(episode);
          const thumb = resolveAnimePosterUrl(episodeThumbnail(episode));
          const num = episodeNumber(episode);
          const customTitle =
            episode.title && !isRedundantEpisodeTitle(episode.title, num)
              ? episode.title
              : undefined;
          const watched = progress >= 0.98;
          const progressWidth = watched
            ? 100
            : Math.round(Math.min(1, Math.max(0, progress)) * 100);

          return (
            <TvFocusable
              key={episode.id}
              disabled={!playable}
              onPress={() => onPlay(episode)}
              style={[styles.card, !playable && styles.cardDisabled]}
            >
              <View style={styles.thumbWrap}>
                {thumb ? (
                  <Image source={{ uri: thumb }} style={styles.thumb} resizeMode="cover" />
                ) : (
                  <View style={styles.thumbFallback} />
                )}
                <View style={styles.playOverlay}>
                  <View style={styles.playBadge}>
                    <Text style={styles.playBadgeText}>{playable ? '▶' : '🔒'}</Text>
                  </View>
                </View>
                {(progress > 0.02 || watched) && (
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progressWidth}%` }]} />
                  </View>
                )}
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.epTitle} numberOfLines={2}>
                  {customTitle
                    ? `${episodeLabel(episode)}. ${customTitle}`
                    : episodeLabel(episode)}
                </Text>
              </View>
            </TvFocusable>
          );
        })}
        {hasMore ? (
          <TvFocusable
            disabled={isFetchingMore}
            onPress={onLoadMore}
            style={styles.loadMore}
          >
            <Text style={styles.loadMoreLabel}>
              {isFetchingMore ? 'Загрузка…' : 'Ещё'}
            </Text>
          </TvFocusable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  title: {
    color: colors.brand,
    fontSize: Platform.isTV ? 22 : 18,
    fontWeight: '700',
  },
  meta: { color: colors.textSecondary },
  rail: {
    gap: spacing.md,
    paddingVertical: spacing.xs,
    alignItems: 'flex-start',
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    padding: 0,
  },
  cardDisabled: { opacity: 0.55 },
  thumbWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.bgElevated,
    position: 'relative',
  },
  thumb: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  thumbFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bgElevated,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  playBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadgeText: {
    color: colors.text,
    fontSize: 12,
  },
  cardBody: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: Platform.isTV ? 56 : 48,
  },
  epTitle: {
    color: colors.text,
    fontSize: Platform.isTV ? 14 : 13,
    fontWeight: '600',
    lineHeight: Platform.isTV ? 18 : 17,
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.brand,
  },
  loadMore: {
    width: Platform.isTV ? 120 : 100,
    height: CARD_WIDTH * (9 / 16) + (Platform.isTV ? 56 : 48),
    borderRadius: radii.lg,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  loadMoreLabel: {
    color: colors.text,
    fontWeight: '700',
  },
});
