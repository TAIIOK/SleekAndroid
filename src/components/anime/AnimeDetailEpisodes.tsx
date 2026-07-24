import { Image } from 'expo-image';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
} from 'react-native';

import { AnimeDubbingSelector } from '@/components/anime/AnimeDubbingSelector';
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
import {
  reportYaniPosterLoadError,
  reportYaniPosterLoadSuccess,
} from '@/lib/imageCdn';
import type { AnimeEpisode } from '@aniverse/types';
import { isTvUi } from '@/lib/isTvUi';

const CARD_WIDTH = isTvUi() ? 200 : 136;
const FILL: DimensionValue = '100%';

interface AnimeDetailEpisodesProps {
  episodes: AnimeEpisode[];
  isLoading?: boolean;
  isFetchingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  progressByEpisodeId?: Record<number, number>;
  onPlay: (episode: AnimeEpisode) => void;
  dubbingOptions?: string[];
  selectedDubbing?: string;
  watchedDubbing?: string | null;
  onSelectDubbing?: (value: string) => void;
  filteredEmptyWhileLoading?: boolean;
}

export function AnimeDetailEpisodes({
  episodes,
  isLoading,
  isFetchingMore,
  hasMore,
  onLoadMore,
  progressByEpisodeId = {},
  onPlay,
  dubbingOptions = [],
  selectedDubbing = '',
  watchedDubbing,
  onSelectDubbing,
  filteredEmptyWhileLoading,
}: AnimeDetailEpisodesProps) {
  const header = (
    <View style={styles.header}>
      <Text style={styles.title} numberOfLines={1}>
        Сезоны и серии
      </Text>
      {dubbingOptions.length > 1 && onSelectDubbing ? (
        <AnimeDubbingSelector
          options={dubbingOptions}
          selected={selectedDubbing}
          watchedOption={watchedDubbing}
          onSelect={onSelectDubbing}
        />
      ) : null}
    </View>
  );

  if (isLoading && !episodes.length) {
    return (
      <View style={styles.section}>
        {header}
        <Text style={styles.meta}>Загрузка эпизодов…</Text>
      </View>
    );
  }

  if (!episodes.length) {
    if (filteredEmptyWhileLoading) {
      return (
        <View style={styles.section}>
          {header}
          <Text style={styles.meta}>Загрузка эпизодов…</Text>
        </View>
      );
    }
    return null;
  }

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
    const progressWidth = (
      watched ? '100%' : `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%`
    ) as DimensionValue;

    return (
      <TvFocusable
        key={episode.id}
        disabled={!playable}
        onPress={() => onPlay(episode)}
        railStart={index === 0}
        style={[
          isTvUi() ? styles.cardTv : styles.card,
          !playable && styles.cardDisabled,
        ]}
      >
        <View style={isTvUi() ? styles.thumbWrapTv : styles.thumbWrap}>
          {thumb ? (
            <Image
              source={{ uri: thumb }}
              style={styles.thumb}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={thumb}
              onLoad={() => reportYaniPosterLoadSuccess()}
              onError={() => reportYaniPosterLoadError(thumb)}
            />
          ) : (
            <View style={styles.thumbFallback} />
          )}
          <View style={styles.playOverlay} pointerEvents="none">
            <View style={styles.playBadge}>
              <Text style={styles.playBadgeText}>{playable ? '▶' : '🔒'}</Text>
            </View>
          </View>
          {(progress > 0.02 || watched) && (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: progressWidth }]} />
            </View>
          )}
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.epTitle} numberOfLines={2}>
            {customTitle
              ? `${episodeLabel(episode)} · ${customTitle}`
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
      style={isTvUi() ? styles.loadMoreTv : styles.loadMore}
    >
      <Text style={styles.loadMoreLabel}>
        {isFetchingMore ? 'Загрузка…' : 'Ещё эпизоды'}
      </Text>
    </TvFocusable>
  ) : null;

  return (
    <View style={styles.section}>
      {header}
      {isTvUi() ? (
        // Plain column — nested ScrollView inside the page ScrollView was overlapping
        // sibling rails ("Похожее") on Android TV when the hero had no poster.
        <View style={styles.listShell}>
          <View style={styles.listContent}>
            {cards}
            {loadMore}
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    color: colors.brand,
    fontSize: isTvUi() ? 20 : 16,
    fontWeight: '700',
    flexShrink: 1,
    minWidth: 0,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: isTvUi() ? 14 : 13,
  },
  rail: {
    gap: isTvUi() ? spacing.md : spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: 'flex-start',
  },
  listShell: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
    width: FILL,
  },
  listContent: {
    padding: spacing.sm,
    gap: 6,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    padding: 0,
  },
  cardTv: {
    width: FILL,
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
    width: FILL,
    aspectRatio: 16 / 9,
    backgroundColor: colors.bgElevated,
    position: 'relative',
    overflow: 'hidden',
  },
  thumbWrapTv: {
    width: 120,
    minHeight: 72,
    alignSelf: 'stretch',
    backgroundColor: colors.bgElevated,
    position: 'relative',
    overflow: 'hidden',
  },
  thumb: {
    ...StyleSheet.absoluteFill,
    width: FILL,
    height: FILL,
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
    width: isTvUi() ? 32 : 28,
    height: isTvUi() ? 32 : 28,
    borderRadius: isTvUi() ? 16 : 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadgeText: {
    color: colors.text,
    fontSize: isTvUi() ? 12 : 11,
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: isTvUi() ? spacing.md : 10,
    paddingVertical: isTvUi() ? spacing.sm : 8,
    justifyContent: 'center',
    minHeight: isTvUi() ? undefined : 40,
  },
  epTitle: {
    color: colors.text,
    fontSize: isTvUi() ? 15 : 12,
    fontWeight: '600',
    lineHeight: isTvUi() ? 20 : 16,
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
    height: FILL,
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
    width: FILL,
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
    fontSize: 14,
  },
});
