import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { LampaDetail } from '@/api/catalog';
import {
  fetchTmdbSeasonDetail,
  type LampaEpisodeDetail,
} from '@/api/lampaExtras';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';
import { useLampaWatchHub, type SourcesSearchProgress } from '@/hooks/useLampaWatchHub';
import { formatRuDate } from '@/lib/catalogLocalization';
import { resolveLampaPosterUrl } from '@/lib/config';
import { lampaProgressKey, resolveLampaTmdbId } from '@/lib/lampaDetail';
import {
  loadLampaLastSelection,
  saveLampaLastSelection,
} from '@/lib/lampaLastSelection';
import { formatProgressLabel } from '@/lib/progressUtils';
import { setLampaWatchPayload } from '@/lib/watchStore';
import { getDownloadService } from '@/services/download';
import { isHlsSourceUrl } from '@/services/download/types';
import { isTvUi } from '@/lib/isTvUi';
import {
  disambiguateDuplicateLabels,
  listWatchHubQualityOptions,
  watchHubSourceKey,
  watchHubSourceLabel,
  watchHubSourceSubtitle,
  watchHubTranslatorKey,
  type WatchHubEpisodeItem,
  type WatchHubSeasonEpisodes,
  type WatchHubSourceResult,
  type WatchHubTranslator,
} from '@/services/watchHub';

function matchStoredSource(
  sources: WatchHubSourceResult[],
  sourceId: string,
): WatchHubSourceResult | undefined {
  const needle = sourceId.trim().toLowerCase();
  if (!needle) return undefined;
  return (
    sources.find((s) => watchHubSourceLabel(s).toLowerCase() === needle) ??
    sources.find((s) => s.source_id?.trim().toLowerCase() === needle) ??
    sources.find((s) => s.title?.trim().toLowerCase() === needle)
  );
}

function matchStoredTranslator(
  translators: WatchHubTranslator[],
  dubId: string,
): WatchHubTranslator | undefined {
  const needle = dubId.trim().toLowerCase();
  if (!needle) return translators[0];
  return (
    translators.find((t) => (t.name ?? '').trim().toLowerCase() === needle) ??
    translators[0]
  );
}

type PickerField = 'source' | 'translator' | 'season';

interface LampaSourceSheetProps {
  visible: boolean;
  onClose: () => void;
  detail: LampaDetail;
  kind: 'movie' | 'tv';
  routeId: string;
  lampaObjectId?: string;
  initialSeason?: number;
  initialEpisode?: number;
  autoPlayPreferredEpisode?: boolean;
  episodeProgressByKey?: Record<string, number>;
}

export function LampaSourceSheet({
  visible,
  onClose,
  detail,
  kind,
  routeId,
  lampaObjectId,
  initialSeason,
  initialEpisode,
  autoPlayPreferredEpisode = false,
  episodeProgressByKey = {},
}: LampaSourceSheetProps) {
  const router = useRouter();
  const isSerial = kind === 'tv';
  const watchHub = useLampaWatchHub({ detail, isSerial, routeId });
  const tmdbId = resolveLampaTmdbId(detail, routeId);

  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [translators, setTranslators] = useState<WatchHubTranslator[]>([]);
  const [selectedTranslator, setSelectedTranslator] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [seasons, setSeasons] = useState<WatchHubSeasonEpisodes[]>([]);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number | null>(null);
  const [loadingTranslators, setLoadingTranslators] = useState(false);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [activePicker, setActivePicker] = useState<PickerField | null>(null);
  const [autoPlayDone, setAutoPlayDone] = useState(false);
  const [restoreDone, setRestoreDone] = useState(false);
  const preferredSeasonRef = useRef<number | undefined>(initialSeason);

  useEffect(() => {
    preferredSeasonRef.current = initialSeason;
  }, [initialSeason]);

  const persistSelection = useCallback(
    (sourceId: string, translatorName: string, seasonNumber: number) => {
      const source = watchHub.sources.find((s) => s.source_id === sourceId);
      const sourceLabel = source ? watchHubSourceLabel(source) : sourceId;
      void saveLampaLastSelection(routeId, {
        sourceId: sourceLabel,
        seasonNumber,
        dubId: translatorName,
      });
      if (lampaObjectId && lampaObjectId !== routeId) {
        void saveLampaLastSelection(lampaObjectId, {
          sourceId: sourceLabel,
          seasonNumber,
          dubId: translatorName,
        });
      }
    },
    [watchHub.sources, routeId, lampaObjectId],
  );

  useEffect(() => {
    if (!visible) {
      setSelectedSource(null);
      setSelectedTranslator(null);
      setTranslators([]);
      setSeasons([]);
      setSelectedSeasonNumber(null);
      setStepError(null);
      setActivePicker(null);
      setAutoPlayDone(false);
      setRestoreDone(false);
      setLoadingTranslators(false);
      setLoadingEpisodes(false);
      setPlaying(false);
      return;
    }
    void watchHub.loadSources();
  }, [visible, watchHub.loadSources]);

  const pickTranslator = useCallback(
    async (
      sourceId: string,
      tr: WatchHubTranslator,
      preferredSeason?: number,
    ) => {
      const name = tr.name ?? `Озвучка ${tr.id}`;
      setSelectedTranslator({ id: tr.id, name });
      setActivePicker(null);
      setStepError(null);

      if (!isSerial) {
        persistSelection(sourceId, name, 1);
        return;
      }

      setLoadingEpisodes(true);
      setSeasons([]);
      setSelectedSeasonNumber(null);
      try {
        const loaded = await watchHub.loadEpisodes(sourceId, tr.id);
        setSeasons(loaded);
        const seasonHint = preferredSeason ?? preferredSeasonRef.current;
        const preferred =
          (seasonHint != null
            ? loaded.find((s) => s.seasonNumber === seasonHint)
            : undefined) ?? loaded[0];
        const seasonNumber = preferred?.seasonNumber ?? null;
        setSelectedSeasonNumber(seasonNumber);
        if (seasonNumber != null) {
          persistSelection(sourceId, name, seasonNumber);
        }
      } catch (e) {
        setStepError(e instanceof Error ? e.message : 'Ошибка загрузки эпизодов');
        setSeasons([]);
      } finally {
        setLoadingEpisodes(false);
      }
    },
    [isSerial, persistSelection, watchHub.loadEpisodes],
  );

  const pickSource = useCallback(
    async (sourceId: string, preferredDubName?: string, preferredSeason?: number) => {
      setSelectedSource(sourceId);
      setSelectedTranslator(null);
      setTranslators([]);
      setSeasons([]);
      setSelectedSeasonNumber(null);
      setStepError(null);
      setActivePicker(null);
      setLoadingTranslators(true);
      try {
        const list = await watchHub.loadTranslators(sourceId);
        setTranslators(list);
        const preferred =
          preferredDubName != null
            ? matchStoredTranslator(list, preferredDubName)
            : list.length === 1
              ? list[0]
              : undefined;
        if (preferred) {
          await pickTranslator(sourceId, preferred, preferredSeason);
        }
      } catch (e) {
        setStepError(e instanceof Error ? e.message : 'Ошибка загрузки озвучек');
        setTranslators([]);
      } finally {
        setLoadingTranslators(false);
      }
    },
    [pickTranslator, watchHub.loadTranslators],
  );

  // Restore last source/dub when sources become available (iOS parity).
  useEffect(() => {
    if (!visible || restoreDone || selectedSource) return;
    if (!watchHub.sources.length) return;

    let cancelled = false;
    void (async () => {
      const selection =
        (await loadLampaLastSelection(routeId)) ??
        (lampaObjectId ? await loadLampaLastSelection(lampaObjectId) : null);
      if (cancelled) return;
      if (!selection) {
        setRestoreDone(true);
        return;
      }
      const source = matchStoredSource(watchHub.sources, selection.sourceId);
      if (!source) {
        // Preferred source may appear later while WatchHub is still searching.
        if (watchHub.sourcesSearch.phase === 'searching') return;
        setRestoreDone(true);
        return;
      }
      setRestoreDone(true);
      preferredSeasonRef.current = selection.seasonNumber;
      await pickSource(source.source_id, selection.dubId, selection.seasonNumber);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    visible,
    restoreDone,
    selectedSource,
    watchHub.sources,
    watchHub.sourcesSearch.phase,
    routeId,
    lampaObjectId,
    pickSource,
  ]);

  const pickSeason = (seasonNumber: number) => {
    setSelectedSeasonNumber(seasonNumber);
    setActivePicker(null);
    if (selectedSource && selectedTranslator) {
      persistSelection(selectedSource, selectedTranslator.name, seasonNumber);
    }
  };

  const playSelection = async (season?: number, episode?: number) => {
    if (!selectedSource || !selectedTranslator) return;
    setPlaying(true);
    setStepError(null);
    try {
      const links = await watchHub.resolveVideoLinks(
        selectedSource,
        selectedTranslator.id,
        season,
        episode,
      );
      if (!links.length) {
        setStepError('Не удалось получить ссылку на видео');
        return;
      }
      persistSelection(
        selectedSource,
        selectedTranslator.name,
        season ?? selectedSeasonNumber ?? 1,
      );
      const title = detail.title ?? detail.name ?? 'Воспроизведение';
      const progressKey =
        season != null && episode != null ? lampaProgressKey(season, episode) : undefined;
      const startProgress = progressKey
        ? episodeProgressByKey[progressKey]
        : Object.values(episodeProgressByKey)[0];
      const taskId = watchHub.getTaskId() ?? undefined;
      const detailRecord = detail as unknown as Record<string, unknown>;
      const imdbRaw = detailRecord.imdbId ?? detailRecord.imdb_id;
      setLampaWatchPayload({
        lampaLinks: links,
        // Prefer numeric route id so continue-watching can open /movies|/series/:id
        // without waiting for library/history enrichment.
        lampaId: /^\d+$/.test(routeId) ? routeId : (lampaObjectId ?? routeId),
        lampaKind: kind,
        lampaTitle: title,
        season,
        episode,
        tmdbId: tmdbId ?? undefined,
        imdbId: typeof imdbRaw === 'string' && imdbRaw.trim() ? imdbRaw.trim() : undefined,
        startProgress:
          startProgress != null && startProgress > 0.01 && startProgress < 0.98
            ? startProgress
            : undefined,
        taskId,
        sourceId: selectedSource,
        translatorId: selectedTranslator.id,
        seasons: isSerial && seasons.length ? seasons : undefined,
      });
      onClose();
      router.push('/watch/lampa');
    } catch (e) {
      setStepError(e instanceof Error ? e.message : 'Ошибка воспроизведения');
    } finally {
      setPlaying(false);
    }
  };

  const downloadSelection = async (season?: number, episode?: number) => {
    if (isTvUi() || !selectedSource || !selectedTranslator) return;
    setPlaying(true);
    setStepError(null);
    try {
      const links = await watchHub.resolveVideoLinks(
        selectedSource,
        selectedTranslator.id,
        season,
        episode,
      );
      const options = listWatchHubQualityOptions(links);
      const direct = options.find((option) => option.url && !isHlsSourceUrl(option.url));
      if (!direct?.url) {
        setStepError('Прямая загрузка для этого источника недоступна');
        return;
      }
      const title = detail.title ?? detail.name ?? 'Загрузка';
      const suffix =
        season != null && episode != null ? ` · S${season}E${episode}` : '';
      await getDownloadService().enqueue({
        contentType: 'lampa',
        title: `${title}${suffix}`,
        sourceUrl: direct.url,
        sourceUrlCandidates: options.map((option) => option.url),
        posterUrl: typeof detail.poster === 'string' ? detail.poster : detail.poster_path,
        lampaKind: kind,
        lampaId: lampaObjectId ?? routeId,
        season,
        episode,
        dubbing: selectedTranslator.name,
        quality: direct.quality,
        isHls: isHlsSourceUrl(direct.url),
      });
      onClose();
      router.push('/downloads');
    } catch (e) {
      setStepError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setPlaying(false);
    }
  };

  const seasonEpisodes = useMemo(() => {
    if (selectedSeasonNumber == null) return [];
    return seasons.find((s) => s.seasonNumber === selectedSeasonNumber)?.episodes ?? [];
  }, [seasons, selectedSeasonNumber]);

  const { data: tmdbSeason } = useQuery({
    queryKey: ['source-sheet-season', tmdbId, selectedSeasonNumber],
    queryFn: () => fetchTmdbSeasonDetail(tmdbId!, selectedSeasonNumber!),
    enabled:
      visible &&
      isSerial &&
      tmdbId != null &&
      selectedSeasonNumber != null &&
      selectedSeasonNumber > 0,
    staleTime: 5 * 60_000,
  });

  const tmdbEpisodeByNumber = useMemo(() => {
    const map = new Map<number, LampaEpisodeDetail>();
    for (const ep of tmdbSeason?.episodes ?? []) {
      map.set(ep.episodeNumber, ep);
    }
    return map;
  }, [tmdbSeason]);

  // Auto-play once last/preferred selection is ready (continue / detail episode tap).
  useEffect(() => {
    if (!visible || autoPlayDone || !autoPlayPreferredEpisode) return;
    if (!selectedSource || !selectedTranslator || loadingTranslators || loadingEpisodes) {
      return;
    }
    if (isSerial) {
      if (initialSeason == null || initialEpisode == null) return;
      const match = seasons
        .flatMap((season) => season.episodes)
        .find((ep) => ep.season === initialSeason && ep.episode === initialEpisode);
      if (!match) return;
      setAutoPlayDone(true);
      void playSelection(match.season, match.episode);
      return;
    }
    setAutoPlayDone(true);
    void playSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot after data load
  }, [
    visible,
    isSerial,
    autoPlayDone,
    autoPlayPreferredEpisode,
    selectedSource,
    selectedTranslator,
    loadingTranslators,
    loadingEpisodes,
    seasons,
    initialSeason,
    initialEpisode,
  ]);

  const selectedSourceResult = selectedSource
    ? watchHub.sources.find((s) => s.source_id === selectedSource)
    : undefined;
  const sourceLabel = selectedSourceResult
    ? watchHubSourceLabel(selectedSourceResult)
    : selectedSource;
  const translatorLabel = selectedTranslator?.name ?? null;
  const seasonLabel =
    selectedSeasonNumber != null ? `Сезон ${selectedSeasonNumber}` : null;

  const busy = loadingTranslators || loadingEpisodes || playing;
  const error = watchHub.error ?? stepError;

  const title = detail.title ?? detail.name ?? 'Выбор источника';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.headerSubtitle}>Выбор источника и озвучки</Text>
          </View>
          <TvFocusable onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.headerBtnLabel}>✕</Text>
          </TvFocusable>
        </View>

        <View style={styles.body}>
          {activePicker ? (
            <PickerOptions
              field={activePicker}
              sources={watchHub.sources}
              selectedSource={selectedSource}
              translators={translators}
              selectedTranslatorId={selectedTranslator?.id ?? null}
              seasons={seasons}
              selectedSeasonNumber={selectedSeasonNumber}
              sourcesSearching={watchHub.sourcesSearch.phase === 'searching'}
              onPickSource={(id) => void pickSource(id)}
              onPickTranslator={(id) => {
                if (!selectedSource) return;
                const tr = translators.find((item) => item.id === id);
                if (tr) void pickTranslator(selectedSource, tr);
              }}
              onPickSeason={pickSeason}
              onClose={() => setActivePicker(null)}
            />
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              nestedScrollEnabled
            >
              <SourcesSearchBanner progress={watchHub.sourcesSearch} />
              {error ? <Text style={styles.error}>{error}</Text> : null}

              {watchHub.sources.length > 0 ? (
                <View style={styles.pickers}>
                  <SelectorRow
                    label="Источник"
                    value={sourceLabel}
                    onOpen={() => setActivePicker('source')}
                    hasTVPreferredFocus={isTvUi()}
                  />
                  <SelectorRow
                    label="Озвучка"
                    value={translatorLabel}
                    placeholder={loadingTranslators ? 'Загрузка…' : 'Выберите'}
                    disabled={!selectedSource || loadingTranslators}
                    onOpen={() => setActivePicker('translator')}
                  />
                  {isSerial ? (
                    <SelectorRow
                      label="Сезон"
                      value={seasonLabel}
                      placeholder={loadingEpisodes ? 'Загрузка…' : 'Выберите'}
                      disabled={
                        !selectedTranslator || loadingEpisodes || seasons.length === 0
                      }
                      onOpen={() => setActivePicker('season')}
                    />
                  ) : null}
                </View>
              ) : null}

              {busy ? (
                <ActivityIndicator color={colors.brand} style={styles.loader} />
              ) : null}

              {isSerial ? (
                <View style={styles.episodesBlock}>
                  {!selectedTranslator ? (
                    selectedSource && !loadingTranslators ? (
                      <Text style={styles.hint}>Выберите озвучку</Text>
                    ) : null
                  ) : loadingEpisodes ? (
                    <Text style={styles.hint}>Загрузка серий…</Text>
                  ) : selectedSeasonNumber == null ? (
                    <Text style={styles.hint}>Выберите сезон</Text>
                  ) : seasonEpisodes.length === 0 ? (
                    <Text style={styles.hint}>Нет доступных серий</Text>
                  ) : (
                    <View style={styles.episodeList}>
                      <Text style={styles.episodesHeading}>Серии</Text>
                      {seasonEpisodes.map((ep) => {
                        const progress =
                          episodeProgressByKey[lampaProgressKey(ep.season, ep.episode)] ?? 0;
                        const isResumeTarget =
                          ep.season === initialSeason && ep.episode === initialEpisode;
                        return (
                          <SourceEpisodeRow
                            key={`${ep.season}-${ep.episode}`}
                            episode={ep}
                            tmdbEpisode={tmdbEpisodeByNumber.get(ep.episode)}
                            progress={progress}
                            highlight={
                              isResumeTarget && (progress > 0.02 || progress >= 0.98)
                            }
                            onPress={() => void playSelection(ep.season, ep.episode)}
                          />
                        );
                      })}
                    </View>
                  )}
                </View>
              ) : selectedTranslator ? (
                <View style={styles.movieActions}>
                  <TvFocusable
                    onPress={() => void playSelection()}
                    style={styles.moviePlay}
                    hasTVPreferredFocus={isTvUi()}
                  >
                    <Text style={styles.moviePlayLabel} numberOfLines={1}>
                      {selectedTranslator.name}
                    </Text>
                    <Text style={styles.moviePlayIcon}>▶</Text>
                  </TvFocusable>
                  {!isTvUi() ? (
                    <TvFocusable
                      onPress={() => void downloadSelection()}
                      style={styles.movieDownload}
                    >
                      <Text style={styles.movieDownloadLabel}>Скачать</Text>
                    </TvFocusable>
                  ) : null}
                </View>
              ) : selectedSource && !loadingTranslators ? (
                <Text style={styles.hint}>Выберите озвучку</Text>
              ) : null}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function SourceEpisodeRow({
  episode,
  tmdbEpisode,
  progress,
  highlight,
  onPress,
}: {
  episode: WatchHubEpisodeItem;
  tmdbEpisode?: LampaEpisodeDetail;
  progress: number;
  highlight?: boolean;
  onPress: () => void;
}) {
  const title =
    tmdbEpisode?.name?.trim() ||
    episode.title?.trim() ||
    `Эпизод ${episode.episode}`;
  const overview = tmdbEpisode?.overview?.trim();
  const airDate = formatRuDate(tmdbEpisode?.airDate);
  const still = resolveLampaPosterUrl(tmdbEpisode?.stillPath, 'w342');
  const progressLabel = formatProgressLabel(progress);
  const watched = progress >= 0.98;
  const progressWidth = watched
    ? 100
    : Math.round(Math.min(1, Math.max(0, progress)) * 100);

  return (
    <TvFocusable
      onPress={onPress}
      style={[styles.episodeRow, highlight && styles.episodeRowHighlight]}
    >
      <View style={styles.stillWrap}>
        {still ? (
          <Image source={{ uri: still }} style={styles.still} resizeMode="cover" />
        ) : (
          <View style={styles.stillFallback}>
            <Text style={styles.stillFallbackText}>{episode.episode}</Text>
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
          <Text style={styles.epNum}>Серия {episode.episode}</Text>
          {progressLabel ? (
            <View style={styles.progressBadge}>
              <Text style={styles.progressBadgeText}>{progressLabel}</Text>
            </View>
          ) : null}
          {airDate ? <Text style={styles.airDate}>{airDate}</Text> : null}
        </View>
        <Text style={styles.epTitle} numberOfLines={1}>
          {title}
        </Text>
        {overview ? (
          <Text style={styles.epOverview} numberOfLines={2}>
            {overview}
          </Text>
        ) : null}
      </View>
    </TvFocusable>
  );
}

function SelectorRow({
  label,
  value,
  placeholder = 'Выберите',
  disabled,
  onOpen,
  hasTVPreferredFocus,
}: {
  label: string;
  value: string | null;
  placeholder?: string;
  disabled?: boolean;
  onOpen: () => void;
  hasTVPreferredFocus?: boolean;
}) {
  const display = value?.trim() || placeholder;
  const isPlaceholder = !value?.trim();

  if (disabled) {
    return (
      <View style={[styles.selector, styles.selectorDisabled]}>
        <Text style={styles.selectorLabel}>{label}</Text>
        <Text style={styles.selectorValueMuted}>{display}</Text>
      </View>
    );
  }

  return (
    <TvFocusable
      onPress={onOpen}
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={styles.selector}
    >
      <View style={styles.selectorText}>
        <Text style={styles.selectorLabel}>{label}</Text>
        <Text
          style={[styles.selectorValue, isPlaceholder && styles.selectorValueMuted]}
          numberOfLines={1}
        >
          {display}
        </Text>
      </View>
      <Text style={styles.selectorChevron}>›</Text>
    </TvFocusable>
  );
}

function SourcesSearchBanner({ progress }: { progress: SourcesSearchProgress }) {
  if (progress.phase === 'idle') return null;

  if (progress.phase === 'searching') {
    const found = progress.readyCount;
    return (
      <View style={styles.searchBanner}>
        <ActivityIndicator color={colors.brand} size="small" />
        <View style={styles.searchBannerText}>
          <Text style={styles.searchBannerTitle}>
            {found > 0
              ? `Поиск источников… Найдено ${found}`
              : 'Поиск источников…'}
          </Text>
          <Text style={styles.searchBannerHint}>
            {found > 0
              ? 'Ещё могут появиться — список обновляется'
              : 'Опрашиваем зеркала, это может занять до минуты'}
          </Text>
        </View>
      </View>
    );
  }

  if (progress.phase === 'done') {
    if (progress.readyCount <= 0) {
      return <Text style={styles.hint}>Источники не найдены</Text>;
    }
    return (
      <Text style={styles.searchDone}>
        Найдено источников: {progress.readyCount}
        {progress.reportedCount > progress.readyCount
          ? ` (готовы ${progress.readyCount} из ${progress.reportedCount})`
          : ''}
      </Text>
    );
  }

  return null;
}

function PickerOptions({
  field,
  sources,
  selectedSource,
  translators,
  selectedTranslatorId,
  seasons,
  selectedSeasonNumber,
  sourcesSearching,
  onPickSource,
  onPickTranslator,
  onPickSeason,
  onClose,
}: {
  field: PickerField;
  sources: ReturnType<typeof useLampaWatchHub>['sources'];
  selectedSource: string | null;
  translators: WatchHubTranslator[];
  selectedTranslatorId: number | null;
  seasons: WatchHubSeasonEpisodes[];
  selectedSeasonNumber: number | null;
  sourcesSearching?: boolean;
  onPickSource: (id: string) => void;
  onPickTranslator: (id: number) => void;
  onPickSeason: (seasonNumber: number) => void;
  onClose: () => void;
}) {
  const title =
    field === 'source' ? 'Источник' : field === 'translator' ? 'Озвучка' : 'Сезон';

  const rawOptions =
    field === 'source'
      ? sources.map((s, index) => ({
          key: watchHubSourceKey(s, index),
          label: watchHubSourceLabel(s),
          subtitle: watchHubSourceSubtitle(s),
          active: selectedSource === s.source_id,
          onPress: () => onPickSource(s.source_id),
        }))
      : field === 'translator'
        ? translators.map((t, index) => ({
            key: watchHubTranslatorKey(t, index),
            label: t.name ?? `Озвучка ${t.id}`,
            subtitle: undefined,
            active: selectedTranslatorId === t.id,
            onPress: () => onPickTranslator(t.id),
          }))
        : seasons.map((s) => ({
            key: String(s.seasonNumber),
            label: `Сезон ${s.seasonNumber}`,
            subtitle: undefined,
            active: selectedSeasonNumber === s.seasonNumber,
            onPress: () => onPickSeason(s.seasonNumber),
          }));
  const options = disambiguateDuplicateLabels(rawOptions);

  return (
    <View style={styles.pickerPane}>
      <View style={styles.pickerHeader}>
        <Text style={styles.pickerTitle}>{title}</Text>
        <TvFocusable onPress={onClose} style={styles.headerBtn}>
          <Text style={styles.headerBtnLabel}>←</Text>
        </TvFocusable>
      </View>
      {field === 'source' && sourcesSearching ? (
        <View style={styles.searchBannerCompact}>
          <ActivityIndicator color={colors.brand} size="small" />
          <Text style={styles.searchBannerHint}>Ищем ещё источники…</Text>
        </View>
      ) : null}
      {!options.length ? (
        <Text style={styles.hint}>
          {field === 'source' && sourcesSearching
            ? 'Пока пусто — поиск продолжается'
            : 'Нет доступных вариантов'}
        </Text>
      ) : field === 'translator' ? (
        <View style={styles.pillGrid}>
          {options.map((opt, index) => (
            <TvFocusable
              key={opt.key}
              onPress={opt.onPress}
              hasTVPreferredFocus={isTvUi() && index === 0}
              style={[styles.pill, opt.active && styles.pillActive]}
            >
              <Text style={[styles.pillLabel, opt.active && styles.pillLabelActive]}>
                {opt.label}
              </Text>
            </TvFocusable>
          ))}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.optionList}>
          {options.map((opt, index) => (
            <TvFocusable
              key={opt.key}
              onPress={opt.onPress}
              hasTVPreferredFocus={isTvUi() && index === 0}
              style={[styles.optionRow, opt.active && styles.optionRowActive]}
            >
              <View style={styles.optionRowText}>
                <Text style={styles.optionRowLabel}>{opt.label}</Text>
                {opt.subtitle ? (
                  <Text style={styles.optionRowSubtitle} numberOfLines={1}>
                    {opt.subtitle}
                  </Text>
                ) : null}
              </View>
              {opt.active ? <Text style={styles.check}>✓</Text> : null}
            </TvFocusable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: isTvUi() ? spacing.xxl : spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.stroke,
  },
  headerText: { flex: 1, minWidth: 0, gap: 2 },
  headerTitle: {
    color: colors.text,
    fontSize: isTvUi() ? 26 : 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  headerBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerBtnLabel: {
    color: colors.text,
    fontSize: 20,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: isTvUi() ? spacing.xxl : spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  pickers: {
    gap: spacing.sm,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: spacing.lg,
    paddingVertical: isTvUi() ? 16 : 14,
  },
  selectorDisabled: {
    opacity: 0.55,
  },
  selectorText: { flex: 1, minWidth: 0, gap: 2 },
  selectorLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectorValue: {
    color: colors.text,
    fontSize: isTvUi() ? 18 : 16,
    fontWeight: '600',
  },
  selectorValueMuted: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  selectorChevron: {
    color: colors.textSecondary,
    fontSize: 28,
    lineHeight: 30,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  searchBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  searchBannerText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  searchBannerTitle: {
    color: colors.text,
    fontSize: isTvUi() ? 17 : 15,
    fontWeight: '600',
  },
  searchBannerHint: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  searchBannerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  searchDone: {
    color: colors.textSecondary,
    fontSize: 14,
    paddingVertical: spacing.xs,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  loader: {
    marginVertical: spacing.sm,
  },
  episodesBlock: {
    gap: spacing.md,
  },
  episodeList: {
    gap: spacing.sm,
  },
  episodesHeading: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    width: '100%',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: spacing.sm,
    overflow: 'hidden',
  },
  episodeRowHighlight: {
    borderColor: 'rgba(195,192,255,0.4)',
    backgroundColor: 'rgba(195,192,255,0.08)',
  },
  stillWrap: {
    width: isTvUi() ? 160 : 120,
    height: isTvUi() ? 90 : 68,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.bgElevated,
    position: 'relative',
    flexShrink: 0,
  },
  still: {
    ...StyleSheet.absoluteFill,
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
  progressBadge: {
    borderRadius: 999,
    backgroundColor: 'rgba(195,192,255,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  progressBadgeText: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: '700',
  },
  airDate: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  epTitle: {
    color: colors.text,
    fontSize: isTvUi() ? 15 : 14,
    fontWeight: '600',
    lineHeight: isTvUi() ? 20 : 18,
  },
  epOverview: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
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
  movieActions: {
    gap: spacing.sm,
  },
  moviePlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  moviePlayLabel: {
    flex: 1,
    color: colors.text,
    fontSize: isTvUi() ? 18 : 16,
    fontWeight: '600',
  },
  moviePlayIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    textAlign: 'center',
    lineHeight: 40,
    backgroundColor: 'rgba(79,70,229,0.2)',
    color: colors.brand,
    fontSize: 16,
  },
  movieDownload: {
    alignItems: 'center',
    padding: spacing.md,
  },
  movieDownloadLabel: {
    color: colors.brand,
    fontWeight: '600',
  },
  pickerPane: {
    flex: 1,
    padding: isTvUi() ? spacing.xxl : spacing.lg,
    gap: spacing.lg,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerTitle: {
    color: colors.text,
    fontSize: isTvUi() ? 24 : 20,
    fontWeight: '700',
  },
  optionList: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgLow,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  optionRowActive: {
    borderColor: colors.brand,
    backgroundColor: 'rgba(195,192,255,0.12)',
  },
  optionRowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  optionRowLabel: {
    color: colors.text,
    fontSize: isTvUi() ? 18 : 16,
    fontWeight: '600',
  },
  optionRowSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  check: {
    color: colors.brand,
    fontSize: 18,
    fontWeight: '700',
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  pillActive: {
    borderColor: 'rgba(195,192,255,0.5)',
    backgroundColor: colors.brandAccent,
  },
  pillLabel: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  pillLabelActive: {
    color: colors.text,
  },
});
