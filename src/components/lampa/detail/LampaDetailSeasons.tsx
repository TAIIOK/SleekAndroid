import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';

import type { LampaSeason } from '@/api/catalog';
import {
  fetchTmdbSeasonDetail,
  type LampaEpisodeDetail,
} from '@/api/lampaExtras';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';
import { formatRuDate } from '@/lib/catalogLocalization';
import { resolveLampaPosterUrl } from '@/lib/config';
import {
  resolveHeldTvEpisodeWindow,
  tvEpisodeWindowSpacerHeights,
} from '@/lib/detailEpisodeWindow';
import { lampaProgressKey } from '@/lib/lampaDetail';
import {
  DETAIL_FOCUS_EPISODES,
  DETAIL_FOCUS_EPISODE_TAIL,
  DETAIL_FOCUS_SEASONS,
  useDetailFocusSlot,
} from '@/lib/detailFocus';
import { isTvUi } from '@/lib/isTvUi';
import { formatProgressLabel } from '@/lib/progressUtils';

const MAX_SEASON_CHIPS = 8;
/** Matches web desktop `max-h-[32rem]` / mobile `max-h-[24rem]`. */
const EPISODE_LIST_MAX_HEIGHT = 360;
const STILL_WIDTH = isTvUi() ? 140 : 96;
const STILL_HEIGHT = isTvUi() ? 79 : 54;
const STILL_DECODE = { width: STILL_WIDTH, height: STILL_HEIGHT };
const EPISODE_CARD_PAD = isTvUi() ? spacing.sm : 6;
const EPISODE_CARD_HEIGHT = STILL_HEIGHT + EPISODE_CARD_PAD * 2;
const EPISODE_STRIDE = EPISODE_CARD_HEIGHT + spacing.sm;

interface LampaDetailSeasonsProps {
  seasons: LampaSeason[];
  tmdbId?: number;
  episodeProgressByKey?: Record<string, number>;
  onSelectEpisode: (season: number, episode: number) => void;
}

interface EpisodeCardProps {
  episode: LampaEpisodeDetail;
  progress: number;
  season: number;
  onSelectEpisode: (season: number, episode: number) => void;
  onFocused?: () => void;
  railStart?: boolean;
  hostRef?: (node: View | null) => void;
  nextFocusUp?: number;
  nextFocusDown?: number;
}

const EpisodeCard = memo(function EpisodeCard({
  episode,
  progress,
  season,
  onSelectEpisode,
  onFocused,
  railStart = false,
  hostRef,
  nextFocusUp,
  nextFocusDown,
}: EpisodeCardProps) {
  const still = resolveLampaPosterUrl(episode.stillPath, 'w342');
  const airDate = formatRuDate(episode.airDate);
  const watched = progress >= 0.98;
  const progressWidth = watched
    ? 100
    : Math.round(Math.min(1, Math.max(0, progress)) * 100);
  const progressLabel = formatProgressLabel(progress);

  const onPress = useCallback(() => {
    onSelectEpisode(season, episode.episodeNumber);
  }, [episode.episodeNumber, onSelectEpisode, season]);

  return (
    <TvFocusable
      onPress={onPress}
      onFocus={onFocused}
      railStart={railStart}
      hostRef={hostRef}
      nextFocusUp={nextFocusUp}
      nextFocusDown={nextFocusDown}
      style={styles.episodeCard}
    >
      <View style={styles.episodeRow}>
        <View style={styles.stillWrap}>
          {still ? (
            <Image
              source={{ uri: still, width: STILL_DECODE.width, height: STILL_DECODE.height }}
              style={styles.still}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={still}
              transition={0}
            />
          ) : (
            <View style={styles.stillFallback}>
              <Text style={styles.stillFallbackText}>{episode.episodeNumber}</Text>
            </View>
          )}
          {(progress > 0.02 || watched) && (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressWidth}%` }]} />
            </View>
          )}
        </View>

        <View style={styles.episodeBody}>
          <View style={styles.episodeMeta}>
            <Text style={styles.epNum}>Серия {episode.episodeNumber}</Text>
            {airDate ? <Text style={styles.airDate}>{airDate}</Text> : null}
          </View>
          <View style={styles.titleRow}>
            <Text style={styles.epTitle} numberOfLines={1}>
              {episode.name}
            </Text>
            {progressLabel ? (
              <View style={styles.progressBadge}>
                <Text style={styles.progressBadgeText}>{progressLabel}</Text>
              </View>
            ) : null}
          </View>
          {episode.overview ? (
            <Text style={styles.epOverview} numberOfLines={2}>
              {episode.overview}
            </Text>
          ) : null}
        </View>
      </View>
    </TvFocusable>
  );
});

const EpisodeSeparator = memo(function EpisodeSeparator() {
  return <View style={styles.episodeSeparator} />;
});

function TvSeasonEpisodeWindow({
  episodes,
  episodeWindow,
  season,
  episodeProgressByKey,
  onSelectEpisode,
  onEpisodeFocus,
}: {
  episodes: LampaEpisodeDetail[];
  episodeWindow: { start: number; end: number };
  season: number;
  episodeProgressByKey: Record<string, number>;
  onSelectEpisode: (season: number, episode: number) => void;
  onEpisodeFocus: (index: number) => void;
}) {
  const episodeHead = useDetailFocusSlot(DETAIL_FOCUS_EPISODES);
  const episodeTail = useDetailFocusSlot(DETAIL_FOCUS_EPISODE_TAIL);
  const spacers = tvEpisodeWindowSpacerHeights(
    episodeWindow.start,
    episodeWindow.end,
    episodes.length,
    EPISODE_STRIDE,
  );
  const visible = episodes.slice(episodeWindow.start, episodeWindow.end);
  return (
    <View style={styles.tvEpisodeColumn}>
      {spacers.top > 0 ? <View style={{ height: spacers.top }} /> : null}
      {visible.map((episode, offset) => {
        const index = episodeWindow.start + offset;
        const isFirst = index === episodeWindow.start;
        const isLast = index === Math.max(episodeWindow.start, episodeWindow.end - 1);
        return (
          <View key={`${season}-${episode.episodeNumber}-${episode.id}`} style={styles.tvEpisodeSlot}>
            <EpisodeCard
              episode={episode}
              season={season}
              progress={episodeProgressByKey[lampaProgressKey(season, episode.episodeNumber)] ?? 0}
              onSelectEpisode={onSelectEpisode}
              onFocused={() => onEpisodeFocus(index)}
              railStart={isFirst}
              hostRef={(node) => {
                if (isFirst) episodeHead.hostRef?.(node);
                if (isLast) episodeTail.hostRef?.(node);
              }}
              nextFocusUp={isFirst ? episodeHead.nextFocusUp : undefined}
              nextFocusDown={isLast ? episodeTail.nextFocusDown : undefined}
            />
          </View>
        );
      })}
      {spacers.bottom > 0 ? <View style={{ height: spacers.bottom }} /> : null}
    </View>
  );
}

export const LampaDetailSeasons = memo(function LampaDetailSeasons({
  seasons,
  tmdbId,
  episodeProgressByKey = {},
  onSelectEpisode,
}: LampaDetailSeasonsProps) {
  const playableSeasons = useMemo(
    () => seasons.filter((season) => (season.seasonNumber ?? 0) > 0),
    [seasons],
  );
  const [selectedSeason, setSelectedSeason] = useState(
    playableSeasons[0]?.seasonNumber ?? 1,
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const first = playableSeasons[0]?.seasonNumber;
    if (first == null) return;
    const stillValid = playableSeasons.some((s) => s.seasonNumber === selectedSeason);
    if (!stillValid) setSelectedSeason(first);
  }, [playableSeasons, selectedSeason]);

  const selectedMeta = playableSeasons.find((s) => s.seasonNumber === selectedSeason);

  const { data, isPending, isError } = useQuery({
    queryKey: ['lampa-season', tmdbId, selectedSeason],
    queryFn: () => fetchTmdbSeasonDetail(tmdbId!, selectedSeason),
    enabled: tmdbId != null && selectedSeason > 0,
    staleTime: 5 * 60_000,
  });

  const episodes: LampaEpisodeDetail[] = useMemo(() => {
    if (data?.episodes) return data.episodes;
    if (!selectedMeta?.episodeCount) return [];
    return Array.from({ length: selectedMeta.episodeCount }, (_, i) => ({
      id: i + 1,
      episodeNumber: i + 1,
      name: `Эпизод ${i + 1}`,
    }));
  }, [data?.episodes, selectedMeta?.episodeCount]);

  const [focusedIndex, setFocusedIndex] = useState(0);
  const [episodeWindow, setEpisodeWindow] = useState({ start: 0, end: 0 });
  const seasonKeyRef = useRef(selectedSeason);
  const seasonFocus = useDetailFocusSlot(DETAIL_FOCUS_SEASONS);

  useEffect(() => {
    const seasonChanged = seasonKeyRef.current !== selectedSeason;
    seasonKeyRef.current = selectedSeason;
    if (seasonChanged) setFocusedIndex(0);
    setEpisodeWindow((current) =>
      resolveHeldTvEpisodeWindow(
        seasonChanged ? 0 : focusedIndex,
        episodes.length,
        seasonChanged || current.end === 0 ? null : current,
      ),
    );
  }, [episodes.length, focusedIndex, selectedSeason]);

  const onEpisodeFocus = useCallback((index: number) => {
    setFocusedIndex(index);
  }, []);

  const renderEpisode = useCallback(
    ({ item }: ListRenderItemInfo<LampaEpisodeDetail>) => (
      <EpisodeCard
        episode={item}
        season={selectedSeason}
        progress={
          episodeProgressByKey[lampaProgressKey(selectedSeason, item.episodeNumber)] ?? 0
        }
        onSelectEpisode={onSelectEpisode}
      />
    ),
    [episodeProgressByKey, onSelectEpisode, selectedSeason],
  );

  const useSeasonPicker = playableSeasons.length > MAX_SEASON_CHIPS;

  if (!playableSeasons.length) return null;

  const episodeList = isTvUi() ? (
    <TvSeasonEpisodeWindow
      episodes={episodes}
      episodeWindow={episodeWindow}
      season={selectedSeason}
      episodeProgressByKey={episodeProgressByKey}
      onSelectEpisode={onSelectEpisode}
      onEpisodeFocus={onEpisodeFocus}
    />
  ) : (
    <FlatList
      data={episodes}
      keyExtractor={(item) => `${selectedSeason}-${item.episodeNumber}-${item.id}`}
      renderItem={renderEpisode}
      style={styles.listScroll}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={EpisodeSeparator}
      nestedScrollEnabled
      showsVerticalScrollIndicator
      initialNumToRender={6}
      maxToRenderPerBatch={4}
      windowSize={5}
      removeClippedSubviews
    />
  );

  const selectedSeasonLabel =
    selectedMeta?.name ?? `Сезон ${selectedSeason}`;

  const seasonPicker = (
    <View style={styles.seasonRailWrap}>
      <TvFocusable
        onPress={() => setPickerOpen(true)}
        hostRef={seasonFocus.hostRef}
        nextFocusUp={seasonFocus.nextFocusUp}
        nextFocusDown={seasonFocus.nextFocusDown}
        style={styles.seasonTrigger}
      >
        <Text style={styles.seasonTriggerLabel} numberOfLines={1}>
          {selectedSeasonLabel}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </TvFocusable>
      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.pickerBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.pickerSheet} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.pickerTitle}>Сезон</Text>
            <ScrollView style={styles.pickerList} contentContainerStyle={styles.pickerListContent}>
              {playableSeasons.map((season, index) => {
                const num = season.seasonNumber ?? 0;
                const active = selectedSeason === num;
                return (
                  <TvFocusable
                    key={num}
                    hasTVPreferredFocus={pickerOpen && (active || (index === 0 && !active))}
                    onPress={() => {
                      setSelectedSeason(num);
                      setPickerOpen(false);
                    }}
                    style={[styles.pickerOption, active && styles.pickerOptionActive]}
                  >
                    <Text style={[styles.pickerOptionLabel, active && styles.pickerOptionLabelActive]}>
                      {season.name ?? `Сезон ${num}`}
                    </Text>
                    {active ? (
                      <Ionicons name="checkmark" size={18} color={colors.brand} />
                    ) : null}
                  </TvFocusable>
                );
              })}
            </ScrollView>
            <TvFocusable onPress={() => setPickerOpen(false)} style={styles.pickerClose}>
              <Text style={styles.pickerCloseLabel}>Закрыть</Text>
            </TvFocusable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );

  const seasonChips = (
    <View style={styles.seasonRailWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.seasonRow}
      >
        {playableSeasons.map((season, index) => {
          const num = season.seasonNumber ?? 0;
          const active = selectedSeason === num;
          return (
            <TvFocusable
              key={num}
              onPress={() => setSelectedSeason(num)}
              hostRef={index === 0 ? seasonFocus.hostRef : undefined}
              nextFocusUp={seasonFocus.nextFocusUp}
              nextFocusDown={seasonFocus.nextFocusDown}
              style={[styles.seasonChip, active && styles.seasonChipActive]}
            >
              <Text style={[styles.seasonChipLabel, active && styles.seasonChipLabelActive]}>
                {season.name ?? `Сезон ${num}`}
              </Text>
            </TvFocusable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Сезоны и серии</Text>

      {useSeasonPicker ? seasonPicker : seasonChips}

      {selectedMeta?.overview ? (
        <Text style={styles.overview} numberOfLines={2}>
          {selectedMeta.overview}
        </Text>
      ) : null}

      {isPending && !episodes.length ? (
        <Text style={styles.meta}>Загрузка эпизодов…</Text>
      ) : null}
      {isError && !episodes.length ? (
        <Text style={styles.meta}>Не удалось загрузить эпизоды сезона</Text>
      ) : null}

      <View style={styles.listShell}>
        {episodeList}
        {episodes.length > 2 && !isTvUi() ? (
          <Text style={styles.scrollHint}>Прокрутите, чтобы увидеть остальные серии</Text>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    width: '100%',
    gap: spacing.md,
  },
  title: {
    color: colors.brand,
    fontSize: isTvUi() ? 22 : 16,
    fontWeight: '700',
  },
  seasonRailWrap: {
    width: '100%',
  },
  seasonRow: {
    gap: isTvUi() ? spacing.sm : 6,
    paddingVertical: 2,
    alignItems: 'center',
  },
  seasonChip: {
    borderRadius: 999,
    paddingHorizontal: isTvUi() ? 14 : 12,
    paddingVertical: isTvUi() ? 8 : 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  seasonChipActive: {
    backgroundColor: colors.brandAccent,
    borderColor: 'rgba(195,192,255,0.45)',
  },
  seasonChipLabel: {
    color: colors.textSecondary,
    fontSize: isTvUi() ? 13 : 12,
    fontWeight: '600',
  },
  seasonChipLabelActive: {
    color: colors.text,
  },
  seasonTrigger: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 999,
    paddingHorizontal: isTvUi() ? 14 : 12,
    paddingVertical: isTvUi() ? 8 : 6,
    backgroundColor: colors.brandAccent,
    borderWidth: 1,
    borderColor: 'rgba(195,192,255,0.45)',
  },
  seasonTriggerLabel: {
    color: colors.text,
    fontSize: isTvUi() ? 13 : 12,
    fontWeight: '600',
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  pickerSheet: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '70%',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: colors.bgElevated,
    padding: spacing.md,
    gap: spacing.sm,
  },
  pickerTitle: {
    color: colors.brand,
    fontSize: isTvUi() ? 20 : 16,
    fontWeight: '700',
  },
  pickerList: {
    maxHeight: 320,
  },
  pickerListContent: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: isTvUi() ? 14 : 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  pickerOptionActive: {
    backgroundColor: 'rgba(167,139,250,0.15)',
    borderWidth: 1,
    borderColor: colors.brand,
  },
  pickerOptionLabel: {
    flex: 1,
    minWidth: 0,
    color: colors.textSecondary,
    fontSize: isTvUi() ? 16 : 14,
    fontWeight: '600',
  },
  pickerOptionLabelActive: {
    color: colors.brand,
  },
  pickerClose: {
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  pickerCloseLabel: {
    color: colors.text,
    fontWeight: '700',
  },
  overview: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  meta: { color: colors.textSecondary, fontSize: 14 },
  listShell: {
    width: '100%',
    gap: spacing.sm,
  },
  listScroll: {
    maxHeight: EPISODE_LIST_MAX_HEIGHT,
    width: '100%',
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  tvEpisodeColumn: {
    width: '100%',
  },
  tvEpisodeSlot: {
    marginBottom: spacing.sm,
  },
  episodeSeparator: {
    height: spacing.sm,
  },
  scrollHint: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  episodeCard: {
    width: '100%',
    height: isTvUi() ? EPISODE_CARD_HEIGHT : undefined,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.border,
    padding: EPISODE_CARD_PAD,
    overflow: 'hidden',
  },
  episodeRow: {
    flexDirection: 'row',
    gap: isTvUi() ? spacing.sm + 2 : spacing.sm,
    alignItems: 'center',
    flex: isTvUi() ? 1 : undefined,
  },
  stillWrap: {
    width: STILL_WIDTH,
    height: STILL_HEIGHT,
    borderRadius: isTvUi() ? 10 : 8,
    overflow: 'hidden',
    backgroundColor: colors.bgElevated,
    position: 'relative',
    flexShrink: 0,
  },
  still: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  stillFallback: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElevated,
  },
  stillFallbackText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  episodeBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    justifyContent: 'center',
  },
  episodeMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  epNum: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  airDate: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
  },
  epTitle: {
    color: colors.text,
    fontSize: isTvUi() ? 15 : 13,
    fontWeight: '600',
    lineHeight: isTvUi() ? 20 : 17,
    flexShrink: 1,
    minWidth: 0,
  },
  progressBadge: {
    borderRadius: 999,
    backgroundColor: 'rgba(195,192,255,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexShrink: 0,
  },
  progressBadgeText: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: '700',
  },
  epOverview: {
    color: colors.textSecondary,
    fontSize: isTvUi() ? 12 : 11,
    lineHeight: isTvUi() ? 16 : 15,
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.brand,
  },
});
