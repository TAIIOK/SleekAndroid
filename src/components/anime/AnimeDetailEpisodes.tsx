import { Image } from 'expo-image';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

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

const CARD_WIDTH = Platform.isTV ? 200 : 168;
const TV_LIST_MAX_HEIGHT = 300;

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

  const cards = episodes.map((episode, index) => {
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
        railStart={index === 0}
        style={[
          Platform.isTV ? styles.cardTv : styles.card,
          !playable && styles.cardDisabled,
        ]}
      >
        <View style={Platform.isTV ? styles.thumbWrapTv : styles.thumbWrap}>
          {thumb ? (
            <Image
              source={{ uri: thumb }}
              style={styles.thumb}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={thumb}
            />
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
  });

  const loadMore = hasMore ? (
    <TvFocusable
      disabled={isFetchingMore}
      onPress={onLoadMore}
      style={Platform.isTV ? styles.loadMoreTv : styles.loadMore}
    >
      <Text style={styles.loadMoreLabel}>
        {isFetchingMore ? 'Загрузка…' : 'Ещё эпизоды'}
      </Text>
    </TvFocusable>
  ) : null;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Сезоны и серии</Text>
      {Platform.isTV ? (
        <View style={styles.listShell}>
          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            {cards}
            {loadMore}
          </ScrollView>
          {episodes.length > 3 ? (
            <Text style={styles.scrollHint}>Вниз — следующие серии</Text>
          ) : null}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rail}
        >
          {cards}
          {loadMore}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  title: {
    color: colors.brand,
    fontSize: Platform.isTV ? 20 : 18,
    fontWeight: '700',
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  rail: {
    gap: spacing.md,
    paddingVertical: spacing.xs,
    alignItems: 'flex-start',
  },
  listShell: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
  },
  listScroll: {
    maxHeight: TV_LIST_MAX_HEIGHT,
  },
  listContent: {
    padding: spacing.sm,
    gap: 6,
  },
  scrollHint: {
    color: colors.textMuted,
    fontSize: 12,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
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
  cardTv: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    padding: 0,
    minHeight: 72,
  },
  cardDisabled: { opacity: 0.55 },
  thumbWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.bgElevated,
    position: 'relative',
  },
  thumbWrapTv: {
    width: 120,
    alignSelf: 'stretch',
    backgroundColor: colors.bgElevated,
    position: 'relative',
  },
  thumb: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  thumbFallback: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bgElevated,
  },
  playOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  playBadge: {
    width: Platform.isTV ? 32 : 36,
    height: Platform.isTV ? 32 : 36,
    borderRadius: Platform.isTV ? 16 : 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadgeText: {
    color: colors.text,
    fontSize: Platform.isTV ? 12 : 12,
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: Platform.isTV ? spacing.md : 12,
    paddingVertical: Platform.isTV ? spacing.sm : 12,
    justifyContent: 'center',
    minHeight: Platform.isTV ? undefined : 48,
  },
  epTitle: {
    color: colors.text,
    fontSize: Platform.isTV ? 15 : 13,
    fontWeight: '600',
    lineHeight: Platform.isTV ? 20 : 17,
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
    width: 100,
    height: CARD_WIDTH * (9 / 16) + 48,
    borderRadius: radii.lg,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  loadMoreTv: {
    width: '100%',
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  loadMoreLabel: {
    color: colors.text,
    fontWeight: '700',
    fontSize: Platform.isTV ? 14 : 14,
  },
});
