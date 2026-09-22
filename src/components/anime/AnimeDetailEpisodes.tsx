import { Image } from 'expo-image';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
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
import { TV_EPISODE_PAGE_SIZE } from '@/lib/detailEpisodeWindow';
import {
  reportYaniPosterLoadError,
  reportYaniPosterLoadSuccess,
} from '@/lib/imageCdn';
import type { AnimeEpisode } from '@aniverse/types';
import { isTvUi } from '@/lib/isTvUi';
import {
  DETAIL_FOCUS_EPISODES,
  DETAIL_FOCUS_EPISODE_TAIL,
  useDetailFocusSlot,
} from '@/lib/detailFocus';

const PHONE_CARD_WIDTH = 112;
const TV_CARD_WIDTH = 176;
const CARD_WIDTH = isTvUi() ? TV_CARD_WIDTH : PHONE_CARD_WIDTH;
const CARD_GAP = isTvUi() ? 10 : 6;
const CARD_STRIDE = PHONE_CARD_WIDTH + 6;
const FILL: DimensionValue = '100%';
const THUMB_DECODE = {
  width: CARD_WIDTH,
  height: Math.round((CARD_WIDTH * 9) / 16),
};

interface AnimeDetailEpisodesProps {
  episodes: AnimeEpisode[];
  isLoading?: boolean;
  isFetchingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  progressByEpisodeId?: Record<number, number>;
  onPlay: (episode: AnimeEpisode) => void;
  totalPages?: number;
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
  hostRef?: (node: View | null) => void;
  nextFocusUp?: number;
  nextFocusDown?: number;
}

const EpisodeCard = memo(function EpisodeCard({
  episode,
  index,
  progress,
  onPlay,
  onFocused,
  railStart = false,
  hostRef,
  nextFocusUp,
  nextFocusDown,
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
      hostRef={hostRef}
      nextFocusUp={nextFocusUp}
      nextFocusDown={nextFocusDown}
      style={[styles.card, !playable && styles.cardDisabled]}
    >
      <View style={styles.thumbWrap}>
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
        <Text style={styles.epTitle} numberOfLines={2}>
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
  totalPages = 1,
  dubbingOptions = [],
  selectedDubbing = '',
  onSelectDubbing,
  filteredEmptyWhileLoading,
}: AnimeDetailEpisodesProps) {
  const episodeHead = useDetailFocusSlot(DETAIL_FOCUS_EPISODES);
  const episodeTail = useDetailFocusSlot(DETAIL_FOCUS_EPISODE_TAIL);
  const [page, setPage] = useState(0);
  const [wantNext, setWantNext] = useState(false);
  const [columns, setColumns] = useState(6);
  const listKey = episodes[0]?.id ?? 0;
  const firstCardRef = useRef<View | null>(null);
  const focusPageRef = useRef(false);

  useEffect(() => {
    setPage(0);
    setWantNext(false);
  }, [listKey]);

  useEffect(() => {
    if (!wantNext) return;
    const nextStart = (page + 1) * TV_EPISODE_PAGE_SIZE;
    if (episodes.length > nextStart) {
      focusPageRef.current = true;
      setPage((value) => value + 1);
      setWantNext(false);
      return;
    }
    if (!isFetchingMore && !hasMore) setWantNext(false);
  }, [episodes.length, hasMore, isFetchingMore, page, wantNext]);

  useEffect(() => {
    if (!isTvUi() || !focusPageRef.current) return;
    focusPageRef.current = false;
    const timer = setTimeout(() => {
      const node = firstCardRef.current as { requestTVFocus?: () => void } | null;
      node?.requestTVFocus?.();
    }, 60);
    return () => clearTimeout(timer);
  }, [page]);

  const showPreviousPage = useCallback(() => {
    focusPageRef.current = true;
    setPage((value) => Math.max(0, value - 1));
  }, []);

  const showNextPage = useCallback(() => {
    const nextStart = (page + 1) * TV_EPISODE_PAGE_SIZE;
    if (episodes.length > nextStart) {
      focusPageRef.current = true;
      setPage((value) => value + 1);
      return;
    }
    if (!hasMore || isFetchingMore) return;
    setWantNext(true);
    onLoadMore?.();
  }, [episodes.length, hasMore, isFetchingMore, onLoadMore, page]);

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

  const pageStart = page * TV_EPISODE_PAGE_SIZE;
  const pageEpisodes = episodes.slice(pageStart, pageStart + TV_EPISODE_PAGE_SIZE);
  const loadedPages = Math.max(1, Math.ceil(episodes.length / TV_EPISODE_PAGE_SIZE));
  const pageCount = Math.max(totalPages, loadedPages);
  const showPrev = page > 0;
  const showNext = page + 1 < loadedPages || Boolean(hasMore);
  const showPager = showPrev || showNext;
  const lastRowCount = pageEpisodes.length % columns || columns;
  const lastRowStart = Math.max(0, pageEpisodes.length - lastRowCount);

  const loadMore = hasMore ? (
    <TvFocusable
      disabled={isFetchingMore}
      onPress={onLoadMore}
      style={styles.loadMore}
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
        <View style={styles.page}>
          <View
            style={styles.grid}
            onLayout={(event) => {
              const width = event.nativeEvent.layout.width;
              const stride = TV_CARD_WIDTH + CARD_GAP;
              const next = Math.max(1, Math.floor((width + CARD_GAP) / stride));
              setColumns((current) => (current === next ? current : next));
            }}
          >
            {pageEpisodes.map((episode, index) => {
              const isFirst = index === 0;
              const onLastRow = index >= lastRowStart;
              return (
                <EpisodeCard
                  key={episode.id}
                  episode={episode}
                  index={pageStart + index}
                  progress={progressByEpisodeId[episode.id] ?? 0}
                  onPlay={onPlay}
                  railStart={index % columns === 0}
                  hostRef={
                    isFirst
                      ? (node) => {
                          firstCardRef.current = node;
                          episodeHead.hostRef?.(node);
                        }
                      : undefined
                  }
                  nextFocusUp={index < columns ? episodeHead.nextFocusUp : undefined}
                  nextFocusDown={onLastRow ? episodeHead.nextFocusDown : undefined}
                />
              );
            })}
          </View>
          {showPager ? (
            <View style={styles.pager}>
              {showPrev ? (
                <TvFocusable
                  onPress={showPreviousPage}
                  hostRef={!showNext ? episodeTail.hostRef : undefined}
                  nextFocusUp={!showNext ? episodeTail.nextFocusUp : undefined}
                  nextFocusDown={!showNext ? episodeTail.nextFocusDown : undefined}
                  style={styles.pageBtn}
                >
                  <Text style={styles.pageBtnLabel}>Назад</Text>
                </TvFocusable>
              ) : null}
              <Text style={styles.pageLabel}>
                {page + 1} / {pageCount}
              </Text>
              {showNext ? (
                <TvFocusable
                  disabled={wantNext || isFetchingMore}
                  onPress={showNextPage}
                  hostRef={episodeTail.hostRef}
                  nextFocusUp={episodeTail.nextFocusUp}
                  nextFocusDown={episodeTail.nextFocusDown}
                  style={styles.pageBtn}
                >
                  <Text style={styles.pageBtnLabel}>
                    {wantNext || isFetchingMore ? 'Загрузка…' : 'Дальше'}
                  </Text>
                </TvFocusable>
              ) : null}
            </View>
          ) : null}
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
    width: PHONE_CARD_WIDTH,
    marginRight: 6,
  },
  page: { gap: spacing.sm },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pageBtn: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pageBtnLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  pageLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
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
  cardDisabled: { opacity: 0.55 },
  thumbWrap: {
    width: FILL,
    aspectRatio: 16 / 9,
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
    paddingHorizontal: isTvUi() ? spacing.sm : 8,
    paddingVertical: isTvUi() ? spacing.sm : 6,
    justifyContent: 'center',
    minHeight: 32,
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
  loadMoreLabel: {
    color: colors.text,
    fontWeight: '700',
    fontSize: isTvUi() ? 14 : 12,
  },
});
