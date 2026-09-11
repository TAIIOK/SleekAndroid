import { Image } from 'expo-image';
import { memo, useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
  type ListRenderItemInfo,
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
  slideTvEpisodeWindow,
  tvEpisodeWindowSpacerHeights,
  TV_EPISODE_CARD_HEIGHT,
  TV_EPISODE_ROW_GAP,
  TV_EPISODE_THUMB_DECODE,
} from '@/lib/detailEpisodeWindow';
import {
  reportYaniPosterLoadError,
  reportYaniPosterLoadSuccess,
} from '@/lib/imageCdn';
import type { AnimeEpisode } from '@aniverse/types';
import { isTvUi } from '@/lib/isTvUi';

const CARD_WIDTH = isTvUi() ? 200 : 112;
const CARD_GAP = 6;
const CARD_STRIDE = CARD_WIDTH + CARD_GAP;
const FILL: DimensionValue = '100%';
const THUMB_DECODE = isTvUi()
  ? TV_EPISODE_THUMB_DECODE
  : { width: CARD_WIDTH, height: Math.round((CARD_WIDTH * 9) / 16) };

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
  onSelectDubbing?: (value: string) => void;
  filteredEmptyWhileLoading?: boolean;
}

interface EpisodeCardProps {
  episode: AnimeEpisode;
  index: number;
  progress: number;
  onPlay: (episode: AnimeEpisode) => void;
  onFocused?: (index: number) => void;
  railStart?: boolean;
}

const EpisodeCard = memo(function EpisodeCard({
  episode,
  index,
  progress,
  onPlay,
  onFocused,
  railStart = false,
}: EpisodeCardProps) {
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

  const handlePress = useCallback(() => {
    onPlay(episode);
  }, [episode, onPlay]);

  const handleFocus = useCallback(() => {
    onFocused?.(index);
  }, [index, onFocused]);

  return (
    <TvFocusable
      disabled={!playable}
      onPress={handlePress}
      onFocus={onFocused ? handleFocus : undefined}
      railStart={railStart}
      style={[
        isTvUi() ? styles.cardTv : styles.card,
        !playable && styles.cardDisabled,
      ]}
    >
      <View style={isTvUi() ? styles.thumbWrapTv : styles.thumbWrap}>
        {thumb ? (
          <Image
            source={{ uri: thumb, width: THUMB_DECODE.width, height: THUMB_DECODE.height }}
            style={styles.thumb}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={thumb}
            transition={0}
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
        <Text style={styles.epTitle} numberOfLines={isTvUi() ? 1 : 2}>
          {customTitle
            ? `${episodeLabel(episode)} · ${customTitle}`
            : episodeLabel(episode)}
        </Text>
      </View>
    </TvFocusable>
  );
});

export const AnimeDetailEpisodes = memo(function AnimeDetailEpisodes({
  episodes,
  isLoading,
  isFetchingMore,
  hasMore,
  onLoadMore,
  progressByEpisodeId = {},
  onPlay,
  dubbingOptions = [],
  selectedDubbing = '',
  onSelectDubbing,
  filteredEmptyWhileLoading,
}: AnimeDetailEpisodesProps) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const listKey = episodes[0]?.id ?? 0;

  useEffect(() => {
    setFocusedIndex(0);
  }, [listKey]);

  useEffect(() => {
    setFocusedIndex((index) => {
      if (episodes.length <= 0) return 0;
      return Math.min(index, episodes.length - 1);
    });
  }, [episodes.length]);

  const onCardFocus = useCallback((index: number) => {
    setFocusedIndex(index);
  }, []);

  const header = (
    <View style={styles.header}>
      <Text style={styles.title} numberOfLines={1}>
        Сезоны и серии
      </Text>
      {dubbingOptions.length > 1 && onSelectDubbing ? (
        <AnimeDubbingSelector
          options={dubbingOptions}
          selected={selectedDubbing}
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

  const episodeWindow = slideTvEpisodeWindow(focusedIndex, episodes.length);
  const spacers = tvEpisodeWindowSpacerHeights(
    episodeWindow.start,
    episodeWindow.end,
    episodes.length,
  );
  const visibleEpisodes = isTvUi()
    ? episodes.slice(episodeWindow.start, episodeWindow.end)
    : episodes;
  const showLoadMore = Boolean(hasMore && (!isTvUi() || episodeWindow.end >= episodes.length));

  const loadMore = showLoadMore ? (
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

  const renderPhoneItem = ({ item, index }: ListRenderItemInfo<AnimeEpisode>) => (
    <View style={styles.phoneCardWrap}>
      <EpisodeCard
        episode={item}
        index={index}
        progress={progressByEpisodeId[item.id] ?? 0}
        onPlay={onPlay}
        railStart={index === 0}
      />
    </View>
  );

  return (
    <View style={styles.section}>
      {header}
      {isTvUi() ? (
        // Plain column — nested ScrollView inside the page ScrollView was overlapping
        // sibling rails ("Похожее") on Android TV when the hero had no poster.
        <View style={styles.listShell}>
          <View style={styles.listContent}>
            {spacers.top > 0 ? <View style={{ height: spacers.top }} /> : null}
            {visibleEpisodes.map((episode, offset) => {
              const index = episodeWindow.start + offset;
              return (
                <View key={episode.id} style={styles.tvCardSlot}>
                  <EpisodeCard
                    episode={episode}
                    index={index}
                    progress={progressByEpisodeId[episode.id] ?? 0}
                    onPlay={onPlay}
                    onFocused={onCardFocus}
                    railStart={offset === 0}
                  />
                </View>
              );
            })}
            {spacers.bottom > 0 ? <View style={{ height: spacers.bottom }} /> : null}
            {loadMore}
          </View>
        </View>
      ) : (
        <FlatList
          horizontal
          data={episodes}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderPhoneItem}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rail}
          initialNumToRender={6}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews
          nestedScrollEnabled
          getItemLayout={(_data, index) => ({
            length: CARD_STRIDE,
            offset: CARD_STRIDE * index,
            index,
          })}
          ListFooterComponent={loadMore}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  section: { gap: isTvUi() ? spacing.sm : 6 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    color: colors.brand,
    fontSize: isTvUi() ? 22 : 16,
    fontWeight: '700',
    flexShrink: 0,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: isTvUi() ? 14 : 13,
  },
  rail: {
    paddingVertical: spacing.xs,
    alignItems: 'flex-start',
  },
  phoneCardWrap: {
    width: CARD_WIDTH,
    marginRight: CARD_GAP,
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
  },
  tvCardSlot: {
    marginBottom: TV_EPISODE_ROW_GAP,
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
    height: TV_EPISODE_CARD_HEIGHT,
    minHeight: TV_EPISODE_CARD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    padding: 0,
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
    width: isTvUi() ? 32 : 24,
    height: isTvUi() ? 32 : 24,
    borderRadius: isTvUi() ? 16 : 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadgeText: {
    color: colors.text,
    fontSize: isTvUi() ? 12 : 10,
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: isTvUi() ? spacing.md : 8,
    paddingVertical: isTvUi() ? spacing.sm : 6,
    justifyContent: 'center',
    minHeight: isTvUi() ? undefined : 32,
  },
  epTitle: {
    color: colors.text,
    fontSize: isTvUi() ? 15 : 13,
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
    width: 88,
    height: CARD_WIDTH * (9 / 16) + 40,
    borderRadius: radii.md,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
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
    fontSize: isTvUi() ? 14 : 12,
  },
});
