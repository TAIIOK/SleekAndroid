import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { LampaSeason } from '@/api/catalog';
import {
  fetchTmdbSeasonDetail,
  type LampaEpisodeDetail,
} from '@/api/lampaExtras';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';
import { formatRuDate } from '@/lib/catalogLocalization';
import { resolveLampaPosterUrl } from '@/lib/config';
import { lampaProgressKey } from '@/lib/lampaDetail';

/** Matches web desktop `max-h-[32rem]` / mobile `max-h-[24rem]`. */
const EPISODE_LIST_MAX_HEIGHT = 360;

interface LampaDetailSeasonsProps {
  seasons: LampaSeason[];
  tmdbId?: number;
  episodeProgressByKey?: Record<string, number>;
  onSelectEpisode: (season: number, episode: number) => void;
}

export function LampaDetailSeasons({
  seasons,
  tmdbId,
  episodeProgressByKey = {},
  onSelectEpisode,
}: LampaDetailSeasonsProps) {
  const playableSeasons = seasons.filter((season) => (season.seasonNumber ?? 0) > 0);
  const [selectedSeason, setSelectedSeason] = useState(
    playableSeasons[0]?.seasonNumber ?? 1,
  );

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

  if (!playableSeasons.length) return null;

  const episodes: LampaEpisodeDetail[] =
    data?.episodes ??
    (selectedMeta?.episodeCount
      ? Array.from({ length: selectedMeta.episodeCount }, (_, i) => ({
          id: i + 1,
          episodeNumber: i + 1,
          name: `Эпизод ${i + 1}`,
        }))
      : []);

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Сезоны и серии</Text>

      <View style={styles.seasonRailWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.seasonRow}
        >
          {playableSeasons.map((season) => {
            const num = season.seasonNumber ?? 0;
            const active = selectedSeason === num;
            return (
              <TvFocusable
                key={num}
                onPress={() => setSelectedSeason(num)}
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
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
          nestedScrollEnabled
          showsVerticalScrollIndicator
        >
          {episodes.map((episode) => {
            const progress =
              episodeProgressByKey[lampaProgressKey(selectedSeason, episode.episodeNumber)] ?? 0;
            return (
              <EpisodeCard
                key={`${selectedSeason}-${episode.episodeNumber}-${episode.id}`}
                episode={episode}
                progress={progress}
                onPress={() => onSelectEpisode(selectedSeason, episode.episodeNumber)}
              />
            );
          })}
        </ScrollView>
        {episodes.length > 2 ? (
          <Text style={styles.scrollHint}>Прокрутите, чтобы увидеть остальные серии</Text>
        ) : null}
      </View>
    </View>
  );
}

function EpisodeCard({
  episode,
  progress,
  onPress,
}: {
  episode: LampaEpisodeDetail;
  progress: number;
  onPress: () => void;
}) {
  const still = resolveLampaPosterUrl(episode.stillPath, 'w342');
  const airDate = formatRuDate(episode.airDate);
  const watched = progress >= 0.98;
  const progressWidth = watched
    ? 100
    : Math.round(Math.min(1, Math.max(0, progress)) * 100);

  return (
    <TvFocusable onPress={onPress} style={styles.episodeCard}>
      <View style={styles.episodeRow}>
        <View style={styles.stillWrap}>
          {still ? (
            <Image source={{ uri: still }} style={styles.still} resizeMode="cover" />
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
          <Text style={styles.epTitle} numberOfLines={1}>
            {episode.name}
          </Text>
          {episode.overview ? (
            <Text style={styles.epOverview} numberOfLines={2}>
              {episode.overview}
            </Text>
          ) : null}
        </View>
      </View>
    </TvFocusable>
  );
}

const STILL_WIDTH = Platform.isTV ? 140 : 96;
const STILL_HEIGHT = Platform.isTV ? 79 : 54;

const styles = StyleSheet.create({
  section: {
    width: '100%',
    gap: spacing.md,
  },
  title: {
    color: colors.brand,
    fontSize: Platform.isTV ? 22 : 16,
    fontWeight: '700',
  },
  seasonRailWrap: {
    width: '100%',
  },
  seasonRow: {
    gap: Platform.isTV ? spacing.sm : 6,
    paddingVertical: 2,
    alignItems: 'center',
  },
  seasonChip: {
    borderRadius: 999,
    paddingHorizontal: Platform.isTV ? 14 : 12,
    paddingVertical: Platform.isTV ? 8 : 6,
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
    fontSize: Platform.isTV ? 13 : 12,
    fontWeight: '600',
  },
  seasonChipLabelActive: {
    color: colors.text,
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
  scrollHint: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  episodeCard: {
    width: '100%',
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.border,
    padding: Platform.isTV ? spacing.sm : 6,
    overflow: 'hidden',
  },
  episodeRow: {
    flexDirection: 'row',
    gap: Platform.isTV ? spacing.sm + 2 : spacing.sm,
    alignItems: 'center',
  },
  stillWrap: {
    width: STILL_WIDTH,
    height: STILL_HEIGHT,
    borderRadius: Platform.isTV ? 10 : 8,
    overflow: 'hidden',
    backgroundColor: colors.bgElevated,
    position: 'relative',
    flexShrink: 0,
  },
  still: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  stillFallback: {
    ...StyleSheet.absoluteFillObject,
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
  epTitle: {
    color: colors.text,
    fontSize: Platform.isTV ? 15 : 13,
    fontWeight: '600',
    lineHeight: Platform.isTV ? 20 : 17,
  },
  epOverview: {
    color: colors.textSecondary,
    fontSize: Platform.isTV ? 12 : 11,
    lineHeight: Platform.isTV ? 16 : 15,
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
