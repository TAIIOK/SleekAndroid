import { Redirect, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { fetchLampaSkipSegments } from '@/api/catalog';
import { fetchLampaProgress, putLampaProgress } from '@/api/progress';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import type { PlaybackErrorInfo, PlayerEpisodeNav } from '@/components/player/types';
import { colors, spacing } from '@/constants/aniverse';
import { useThrottledLampaProgress } from '@/hooks/useThrottledLampaProgress';
import {
  getDownloadPreferencesSync,
  loadDownloadPreferences,
  saveDownloadPreferences,
} from '@/lib/downloadPreferences';
import {
  findLinkByQuality,
  lampaConnectionLabel,
  lampaDeliveryLabel,
  linkSupportsConnection,
  linkSupportsDelivery,
  listLampaQualityLabels,
  normalizePlaybackModes,
  pickDefaultLampaQuality,
  resolveLampaPlaybackUrl,
  type LampaConnectionMode,
  type LampaDeliveryMode,
} from '@/lib/lampaPlaybackOptions';
import { saveLampaLastSelection } from '@/lib/lampaLastSelection';
import { buildLampaSkipSegments, buildSkipSegments } from '@/lib/playerSkip';
import {
  isEpisodeCompleted,
  lampaResumeProgress,
  lampaSeasonEpisodeForWatch,
} from '@/lib/progressUtils';
import {
  consumeLampaWatchPayload,
  lampaEpisodeNavId,
  parseLampaEpisodeNavId,
} from '@/lib/watchStore';
import { useAuth } from '@/providers/AuthProvider';
import {
  fetchTranslators,
  fetchVideoLinks,
  type WatchHubTranslator,
  type WatchHubVideoLink,
} from '@/services/watchHub';

export default function WatchLampaScreen() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [payload] = useState(() => consumeLampaWatchPayload());

  const downloadPrefs = getDownloadPreferencesSync();
  const [lampaLinks, setLampaLinks] = useState<WatchHubVideoLink[]>(
    () => payload?.lampaLinks ?? [],
  );
  const [season, setSeason] = useState<number | undefined>(() => payload?.season);
  const [episode, setEpisode] = useState<number | undefined>(() => payload?.episode);
  const [translatorId, setTranslatorId] = useState<number | undefined>(
    () => payload?.translatorId,
  );
  const [switchingEpisode, setSwitchingEpisode] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  const [lampaQuality, setLampaQuality] = useState('');
  const [lampaConnection, setLampaConnection] = useState<LampaConnectionMode>(
    downloadPrefs.directFirst ? 'direct' : 'proxy',
  );
  const [lampaDelivery, setLampaDelivery] = useState<LampaDeliveryMode>(
    downloadPrefs.preferStreamOverFile ? 'stream' : 'file',
  );
  const playbackTimeRef = useRef(0);
  const durationRef = useRef(0);
  const httpFallbackTriedRef = useRef(false);
  const hasSwitchedEpisodeRef = useRef(false);
  const [skipSegments, setSkipSegments] = useState(buildSkipSegments());
  /** Preserve position across quality/translator URL switches. */
  const [resumeOverrideSec, setResumeOverrideSec] = useState<number | undefined>();

  useEffect(() => {
    void loadDownloadPreferences().then((prefs) => {
      setLampaConnection(prefs.directFirst ? 'direct' : 'proxy');
      setLampaDelivery(prefs.preferStreamOverFile ? 'stream' : 'file');
    });
  }, []);

  const lampaId = payload?.lampaId?.trim() ?? '';
  const isSerial = payload?.lampaKind === 'tv';
  const tmdbId = useMemo(() => {
    if (payload?.tmdbId != null && Number.isFinite(payload.tmdbId) && payload.tmdbId > 0) {
      return payload.tmdbId;
    }
    const fromLampaId = Number(lampaId);
    if (Number.isFinite(fromLampaId) && fromLampaId > 0) return fromLampaId;
    return undefined;
  }, [payload?.tmdbId, lampaId]);
  const taskId = payload?.taskId?.trim() ?? '';
  const sourceId = payload?.sourceId?.trim() ?? '';
  const canLoadTranslators = Boolean(taskId && sourceId);
  const canNavigateEpisodes = Boolean(
    isSerial &&
      taskId &&
      sourceId &&
      translatorId != null &&
      (payload?.seasons?.length ?? 0) > 0,
  );

  const { data: lampaTranslators = [] } = useQuery({
    queryKey: ['lampa-watch-translators', taskId, sourceId],
    queryFn: () => fetchTranslators(taskId, sourceId),
    enabled: canLoadTranslators,
    staleTime: 120_000,
  });

  useEffect(() => {
    httpFallbackTriedRef.current = false;
  }, [lampaId, season, episode, lampaLinks]);

  useEffect(() => {
    if (!isSerial) {
      setSkipSegments(buildSkipSegments());
      return;
    }
    if (tmdbId == null || season == null || episode == null) {
      setSkipSegments(buildSkipSegments());
      return;
    }

    setSkipSegments(buildSkipSegments());
    let cancelled = false;
    void (async () => {
      const segments = await fetchLampaSkipSegments({
        tmdbId,
        imdbId: payload?.imdbId,
        season,
        episode,
      });
      if (!cancelled) setSkipSegments(buildLampaSkipSegments(segments));
    })();

    return () => {
      cancelled = true;
    };
  }, [isSerial, tmdbId, payload?.imdbId, season, episode]);

  const { data: progressRows = [] } = useQuery({
    queryKey: ['lampa-progress', lampaId || undefined],
    queryFn: () => fetchLampaProgress(lampaId),
    enabled: isAuthenticated && !!lampaId,
    staleTime: 30_000,
  });

  const qualityOptionsList = useMemo(
    () => listLampaQualityLabels(lampaLinks),
    [lampaLinks],
  );

  useEffect(() => {
    if (!qualityOptionsList.length) return;
    setLampaQuality((current) => {
      if (current && qualityOptionsList.includes(current)) return current;
      return pickDefaultLampaQuality(qualityOptionsList);
    });
  }, [qualityOptionsList]);

  const activeLampaLink = useMemo(() => {
    const quality = lampaQuality || pickDefaultLampaQuality(qualityOptionsList);
    return findLinkByQuality(lampaLinks, quality) ?? lampaLinks[0];
  }, [lampaLinks, lampaQuality, qualityOptionsList]);

  useEffect(() => {
    if (!activeLampaLink) return;
    const modes = normalizePlaybackModes(activeLampaLink, lampaConnection, lampaDelivery);
    if (modes.connection !== lampaConnection) setLampaConnection(modes.connection);
    if (modes.delivery !== lampaDelivery) setLampaDelivery(modes.delivery);
  }, [activeLampaLink, lampaConnection, lampaDelivery]);

  const src = useMemo(() => {
    if (!activeLampaLink) return undefined;
    const modes = normalizePlaybackModes(activeLampaLink, lampaConnection, lampaDelivery);
    return resolveLampaPlaybackUrl(
      lampaLinks,
      lampaQuality || pickDefaultLampaQuality(qualityOptionsList),
      modes.connection,
      modes.delivery,
    );
  }, [
    activeLampaLink,
    lampaLinks,
    lampaQuality,
    qualityOptionsList,
    lampaConnection,
    lampaDelivery,
  ]);

  const syncedProgress = useMemo(
    () => lampaResumeProgress(progressRows, lampaId, season, episode, isSerial),
    [progressRows, lampaId, season, episode, isSerial],
  );

  // Derive resume on render so continue-watching position is available before onLoad.
  const { resumeTime, resumeFraction } = useMemo(() => {
    if (resumeOverrideSec != null && resumeOverrideSec > 0) {
      return { resumeTime: resumeOverrideSec, resumeFraction: undefined };
    }
    const usePayloadStart =
      !hasSwitchedEpisodeRef.current &&
      payload?.startProgress != null &&
      payload.startProgress > 0.01 &&
      season === payload.season &&
      episode === payload.episode;
    const fraction = usePayloadStart ? payload.startProgress : syncedProgress;
    if (fraction != null && fraction > 0.01) {
      return { resumeTime: undefined, resumeFraction: fraction };
    }
    // After an in-player episode switch with no saved progress, start from 0.
    return {
      resumeTime: hasSwitchedEpisodeRef.current ? 0 : undefined,
      resumeFraction: undefined,
    };
  }, [
    resumeOverrideSec,
    payload?.startProgress,
    payload?.season,
    payload?.episode,
    syncedProgress,
    season,
    episode,
  ]);

  useEffect(() => {
    playbackTimeRef.current = 0;
    durationRef.current = 0;
    setResumeOverrideSec(undefined);
  }, [lampaId, season, episode]);

  const title = useMemo(() => {
    if (!payload) return 'Воспроизведение';
    return payload.lampaTitle || 'Воспроизведение';
  }, [payload]);

  const subtitle = useMemo(() => {
    if (!payload) return undefined;
    const parts: string[] = [];
    if (season != null && episode != null) {
      parts.push(`Сезон ${season} · Эпизод ${episode}`);
    }
    if (qualityOptionsList.length > 0) {
      parts.push(lampaQuality || pickDefaultLampaQuality(qualityOptionsList));
    }
    parts.push(lampaConnectionLabel(lampaConnection));
    parts.push(lampaDeliveryLabel(lampaDelivery));
    return parts.join(' · ');
  }, [payload, season, episode, qualityOptionsList, lampaQuality, lampaConnection, lampaDelivery]);

  const syncProgress = useThrottledLampaProgress(
    isAuthenticated && !!lampaId,
    lampaId,
    isSerial,
    season,
    episode,
  );

  const flushProgress = useCallback(() => {
    if (!isAuthenticated || !lampaId.trim()) return;
    const coords = lampaSeasonEpisodeForWatch(isSerial, season, episode);
    if (!coords) return;
    const current = playbackTimeRef.current;
    const duration = durationRef.current;
    if (!(duration > 1) || !(current > 0)) return;
    const progress = Math.min(1, Math.max(0, current / duration));
    void putLampaProgress({
      lampaId: lampaId.trim(),
      seasonOrdinal: coords.seasonOrdinal,
      episodeOrdinal: coords.episodeOrdinal,
      progress,
      completed: isEpisodeCompleted(progress),
    });
  }, [isAuthenticated, lampaId, isSerial, season, episode]);

  const episodeItems = useMemo(() => {
    if (!canNavigateEpisodes || !payload?.seasons) return [];
    return payload.seasons.flatMap((seasonRow) =>
      seasonRow.episodes.map((ep) => ({
        id: lampaEpisodeNavId(ep.season, ep.episode),
        season: ep.season,
        episode: ep.episode,
        number: ep.episode,
        title: ep.title?.trim() || undefined,
        label:
          payload.seasons!.length > 1
            ? `S${ep.season}E${ep.episode}${ep.title?.trim() ? ` · ${ep.title}` : ''}`
            : ep.title?.trim()
              ? `Эп. ${ep.episode} · ${ep.title}`
              : `Эпизод ${ep.episode}`,
      })),
    );
  }, [canNavigateEpisodes, payload?.seasons]);

  const currentEpisodeIndex = useMemo(() => {
    if (season == null || episode == null) return -1;
    const id = lampaEpisodeNavId(season, episode);
    return episodeItems.findIndex((item) => item.id === id);
  }, [episodeItems, season, episode]);

  const previousEpisode =
    currentEpisodeIndex > 0 ? episodeItems[currentEpisodeIndex - 1] : undefined;
  const nextEpisode =
    currentEpisodeIndex >= 0 && currentEpisodeIndex < episodeItems.length - 1
      ? episodeItems[currentEpisodeIndex + 1]
      : undefined;

  const persistTranslatorChoice = useCallback(
    (translator: WatchHubTranslator) => {
      const mediaId = lampaId.trim();
      if (!mediaId) return;
      const dubId = translator.name?.trim() || String(translator.id);
      void saveLampaLastSelection(mediaId, {
        sourceId: sourceId || mediaId,
        seasonNumber: season ?? 1,
        dubId,
      });
    },
    [lampaId, sourceId, season],
  );

  const switchLampaTranslator = useCallback(
    async (translator: WatchHubTranslator) => {
      if (!taskId || !sourceId) {
        setSwitchError('Нет контекста WatchHub для смены озвучки');
        return;
      }
      if (translator.id === translatorId) return;
      if (switchingEpisode) return;

      if (playbackTimeRef.current > 0) {
        setResumeOverrideSec(playbackTimeRef.current);
      }

      setSwitchingEpisode(true);
      setSwitchError(null);
      try {
        const links = await fetchVideoLinks({
          taskId,
          sourceId,
          translatorId: translator.id,
          season,
          episode,
        });
        if (!links.length) {
          setSwitchError('Для этой озвучки нет ссылки на текущий эпизод');
          return;
        }
        hasSwitchedEpisodeRef.current = true;
        setLampaLinks(links);
        setTranslatorId(translator.id);
        persistTranslatorChoice(translator);
      } catch (e) {
        setSwitchError(e instanceof Error ? e.message : 'Ошибка смены озвучки');
      } finally {
        setSwitchingEpisode(false);
      }
    },
    [taskId, sourceId, translatorId, switchingEpisode, season, episode, persistTranslatorChoice],
  );

  const navigateToEpisode = useCallback(
    async (nextSeason: number, nextEpisodeNum: number) => {
      if (!taskId || !sourceId || translatorId == null) return;
      if (nextSeason === season && nextEpisodeNum === episode) return;
      if (switchingEpisode) return;

      flushProgress();
      setSwitchingEpisode(true);
      setSwitchError(null);
      try {
        const links = await fetchVideoLinks({
          taskId,
          sourceId,
          translatorId,
          season: nextSeason,
          episode: nextEpisodeNum,
        });
        if (!links.length) {
          setSwitchError('Не удалось получить ссылку на серию');
          return;
        }
        hasSwitchedEpisodeRef.current = true;
        setLampaLinks(links);
        setSeason(nextSeason);
        setEpisode(nextEpisodeNum);
      } catch (e) {
        setSwitchError(e instanceof Error ? e.message : 'Ошибка смены серии');
      } finally {
        setSwitchingEpisode(false);
      }
    },
    [taskId, sourceId, translatorId, season, episode, switchingEpisode, flushProgress],
  );

  const episodeNav: PlayerEpisodeNav | undefined = useMemo(() => {
    if (!canNavigateEpisodes || episodeItems.length < 2) return undefined;
    return {
      items: episodeItems.map(({ id, label, season: s, number: n, episode: epNum, title }) => ({
        id,
        label,
        season: s,
        number: n,
        title: title?.trim() || `Эпизод ${epNum}`,
      })),
      currentEpisodeId:
        season != null && episode != null ? lampaEpisodeNavId(season, episode) : undefined,
      hasPrevious: Boolean(previousEpisode),
      hasNext: Boolean(nextEpisode),
      onPrevious: previousEpisode
        ? () => void navigateToEpisode(previousEpisode.season, previousEpisode.episode)
        : undefined,
      onNext: nextEpisode
        ? () => void navigateToEpisode(nextEpisode.season, nextEpisode.episode)
        : undefined,
      onSelect: (id) => {
        const parsed = parseLampaEpisodeNavId(id);
        void navigateToEpisode(parsed.season, parsed.episode);
      },
    };
  }, [
    canNavigateEpisodes,
    episodeItems,
    season,
    episode,
    previousEpisode,
    nextEpisode,
    navigateToEpisode,
  ]);

  const switchWithResume = (apply: () => void) => {
    if (playbackTimeRef.current > 0) {
      setResumeOverrideSec(playbackTimeRef.current);
    }
    apply();
  };

  const handlePlaybackError = useCallback(
    (info: PlaybackErrorInfo) => {
      if (!info.isBadHttpStatus || httpFallbackTriedRef.current) return false;
      if (lampaConnection !== 'direct' || !activeLampaLink) return false;
      if (!linkSupportsConnection(activeLampaLink, 'proxy')) return false;

      httpFallbackTriedRef.current = true;
      switchWithResume(() => {
        setLampaConnection('proxy');
        void saveDownloadPreferences({ directFirst: false });
      });
      return true;
    },
    [activeLampaLink, lampaConnection],
  );

  if (authLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (!payload || !src) {
    return (
      <View style={styles.loader}>
        <Text style={styles.errorTitle}>Нет источника видео</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Назад</Text>
        </Pressable>
      </View>
    );
  }

  const dubbingOptions =
    canLoadTranslators && lampaTranslators.length > 1
      ? lampaTranslators.map((translator) => {
          const label = translator.name?.trim() || `Озвучка ${translator.id}`;
          return {
            id: String(translator.id),
            label,
            selected: translator.id === translatorId,
            onSelect: () => {
              void switchLampaTranslator(translator);
            },
          };
        })
      : undefined;

  const qualityOptions =
    qualityOptionsList.length > 1
      ? qualityOptionsList.map((label) => ({
          id: label,
          label,
          selected: label === (lampaQuality || pickDefaultLampaQuality(qualityOptionsList)),
          onSelect: () => switchWithResume(() => setLampaQuality(label)),
        }))
      : undefined;

  const connectionOptions =
    activeLampaLink &&
    linkSupportsConnection(activeLampaLink, 'direct') &&
    linkSupportsConnection(activeLampaLink, 'proxy')
      ? (['direct', 'proxy'] as const).map((mode) => ({
          id: mode,
          label: lampaConnectionLabel(mode),
          selected: mode === lampaConnection,
          onSelect: () =>
            switchWithResume(() => {
              setLampaConnection(mode);
              void saveDownloadPreferences({ directFirst: mode === 'direct' });
            }),
        }))
      : undefined;

  const deliveryOptions =
    activeLampaLink &&
    linkSupportsDelivery(activeLampaLink, lampaConnection, 'stream') &&
    linkSupportsDelivery(activeLampaLink, lampaConnection, 'file')
      ? (['stream', 'file'] as const).map((mode) => ({
          id: mode,
          label: lampaDeliveryLabel(mode),
          selected: mode === lampaDelivery,
          onSelect: () =>
            switchWithResume(() => {
              setLampaDelivery(mode);
              void saveDownloadPreferences({ preferStreamOverFile: mode === 'stream' });
            }),
        }))
      : undefined;

  return (
    <View style={styles.root}>
      <VideoPlayer
        src={src}
        title={title}
        subtitle={subtitle}
        startTime={resumeTime}
        startProgressFraction={resumeFraction}
        skipSegments={skipSegments}
        onBack={() => router.back()}
        dubbingOptions={dubbingOptions}
        qualityOptions={qualityOptions}
        connectionOptions={connectionOptions}
        deliveryOptions={deliveryOptions}
        episodeNav={episodeNav}
        onAutoPlayNext={
          nextEpisode
            ? () => void navigateToEpisode(nextEpisode.season, nextEpisode.episode)
            : undefined
        }
        onPlaybackError={handlePlaybackError}
        onProgress={(current, duration) => {
          playbackTimeRef.current = current;
          durationRef.current = duration;
          syncProgress(current, duration);
        }}
      />
      {switchingEpisode ? (
        <View style={styles.switchOverlay} pointerEvents="none">
          <ActivityIndicator color={colors.brand} size="large" />
          <Text style={styles.switchText}>Загрузка серии…</Text>
        </View>
      ) : null}
      {switchError ? (
        <View style={styles.switchErrorBanner}>
          <Text style={styles.switchErrorText}>{switchError}</Text>
          <Pressable onPress={() => setSwitchError(null)} style={styles.switchErrorDismiss}>
            <Text style={styles.switchErrorDismissText}>OK</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  errorTitle: { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  backBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.bgElevated,
  },
  backText: { color: colors.text, fontSize: 18, fontWeight: '600' },
  switchOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  switchText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  switchErrorBanner: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xxl,
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  switchErrorText: { color: colors.text, flex: 1, fontSize: 15 },
  switchErrorDismiss: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  switchErrorDismissText: { color: colors.brand, fontWeight: '700', fontSize: 15 },
});
