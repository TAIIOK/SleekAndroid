import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { fetchAnimeDetail, fetchAnimeEpisodes, fetchAnimeSkip } from '@/api/catalog';
import { fetchAnimeProgress } from '@/api/progress';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { colors, spacing } from '@/constants/aniverse';
import { useThrottledEpisodeProgress } from '@/hooks/useThrottledEpisodeProgress';
import { useWatchEpisodeNavigation } from '@/hooks/useWatchEpisodeNavigation';
import { saveAnimeLastDubbing } from '@/lib/animeLastDubbing';
import {
  getQualityOptionsForDubbing,
  getUniqueDubbingOptions,
  pickBestDubbingOption,
  pickDefaultQuality,
  pickPlaybackUrl,
  type PlaybackQuality,
} from '@/lib/animePlaybackOptions';
import { buildSkipSegments, parseSkipInterval } from '@/lib/playerSkip';
import { animeResumeProgress } from '@/lib/progressUtils';
import { useAuth } from '@/providers/AuthProvider';

export default function WatchAnimeScreen() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { animeId, episodeId, title: titleParam, startProgress, preferredDubbing } =
    useLocalSearchParams<{
      animeId: string;
      episodeId: string;
      title?: string;
      startProgress?: string;
      preferredDubbing?: string;
    }>();

  const numericAnimeId = Number(animeId);
  const numericEpisodeId = Number(episodeId);

  const { data: detail } = useQuery({
    queryKey: ['anime', numericAnimeId],
    queryFn: () => fetchAnimeDetail(numericAnimeId),
    enabled: Number.isFinite(numericAnimeId),
    staleTime: 60_000,
  });

  const { data: episodesData, isLoading, isError } = useQuery({
    queryKey: ['watch', numericAnimeId, numericEpisodeId],
    queryFn: () => fetchAnimeEpisodes(numericAnimeId, 1, 100),
    enabled: Number.isFinite(numericAnimeId),
  });

  const { data: progressRows = [] } = useQuery({
    queryKey: ['anime-progress', numericAnimeId],
    queryFn: () => fetchAnimeProgress(numericAnimeId),
    enabled: isAuthenticated && Number.isFinite(numericAnimeId),
    staleTime: 30_000,
  });

  const episode = episodesData?.episodes.find((e) => e.id === numericEpisodeId);
  const videos = episode?.video ?? [];
  const progressByEpisodeId = useMemo(() => {
    const map: Record<number, number> = {};
    for (const row of progressRows) {
      if (typeof row.episodeId === 'number' && typeof row.progress === 'number') {
        map[row.episodeId] = row.progress;
      }
    }
    return map;
  }, [progressRows]);
  const episodeNav = useWatchEpisodeNavigation(
    numericAnimeId,
    numericEpisodeId,
    progressByEpisodeId,
  );
  const episodeOrdinal = episode?.ordinal ?? episode?.id;

  const dubbingOptionsList = useMemo(() => getUniqueDubbingOptions(videos), [videos]);
  const [selectedDubbing, setSelectedDubbing] = useState('');
  const [selectedQuality, setSelectedQuality] = useState<PlaybackQuality>('720p');
  const [skipSegments, setSkipSegments] = useState(buildSkipSegments());
  const playbackTimeRef = useRef(0);
  const [resumeTime, setResumeTime] = useState<number | undefined>();
  const [resumeFraction, setResumeFraction] = useState<number | undefined>();

  const qualityOptionsList = useMemo(
    () => getQualityOptionsForDubbing(videos, selectedDubbing),
    [videos, selectedDubbing],
  );

  const src = useMemo(() => {
    if (!selectedDubbing) return undefined;
    return pickPlaybackUrl(videos, selectedDubbing, selectedQuality);
  }, [videos, selectedDubbing, selectedQuality]);

  const title = titleParam || detail?.title || 'Воспроизведение';
  const subtitle = useMemo(() => {
    const parts: string[] = [];
    if (episodeOrdinal) parts.push(`Эпизод ${episodeOrdinal}`);
    if (selectedDubbing && selectedDubbing !== 'Не указана') parts.push(selectedDubbing);
    if (qualityOptionsList.length > 0) parts.push(selectedQuality);
    return parts.length ? parts.join(' · ') : undefined;
  }, [episodeOrdinal, selectedDubbing, selectedQuality, qualityOptionsList.length]);

  const routeProgress = startProgress ? Number(startProgress) : undefined;
  const syncedProgress = useMemo(
    () => animeResumeProgress(progressRows, numericEpisodeId),
    [progressRows, numericEpisodeId],
  );

  useEffect(() => {
    playbackTimeRef.current = 0;
    const fraction =
      routeProgress != null && Number.isFinite(routeProgress) && routeProgress > 0.01
        ? routeProgress
        : syncedProgress;

    if (fraction == null || fraction <= 0.01) {
      setResumeTime(undefined);
      setResumeFraction(undefined);
      return;
    }

    if (episode?.duration && episode.duration > 0) {
      setResumeTime(fraction * episode.duration);
      setResumeFraction(undefined);
      return;
    }

    setResumeTime(undefined);
    setResumeFraction(fraction);
  }, [numericEpisodeId, routeProgress, syncedProgress, episode?.duration]);

  useEffect(() => {
    if (!dubbingOptionsList.length) return;
    setSelectedDubbing((current) => {
      if (current && dubbingOptionsList.includes(current)) return current;
      if (preferredDubbing && dubbingOptionsList.includes(preferredDubbing)) {
        return preferredDubbing;
      }
      return pickBestDubbingOption(videos) ?? dubbingOptionsList[0];
    });
  }, [dubbingOptionsList, videos, preferredDubbing, numericEpisodeId]);

  useEffect(() => {
    if (!qualityOptionsList.length) return;
    if (!qualityOptionsList.includes(selectedQuality)) {
      setSelectedQuality(pickDefaultQuality(qualityOptionsList));
    }
  }, [qualityOptionsList, selectedQuality]);

  useEffect(() => {
    if (!episodeOrdinal || !Number.isFinite(numericAnimeId)) return;
    void (async () => {
      const [openingRes, endingRes] = await Promise.all([
        fetchAnimeSkip(numericAnimeId, episodeOrdinal, 'opening'),
        fetchAnimeSkip(numericAnimeId, episodeOrdinal, 'ending'),
      ]);
      setSkipSegments(
        buildSkipSegments(
          parseSkipInterval(openingRes, 'opening'),
          parseSkipInterval(endingRes, 'ending'),
        ),
      );
    })();
  }, [numericAnimeId, episodeOrdinal]);

  const syncProgress = useThrottledEpisodeProgress(
    isAuthenticated,
    numericAnimeId,
    numericEpisodeId,
    episodeOrdinal,
  );

  const switchWithResume = (apply: () => void) => {
    if (playbackTimeRef.current > 0) {
      setResumeTime(playbackTimeRef.current);
      setResumeFraction(undefined);
    }
    apply();
  };

  const navigateToEpisode = useCallback(
    (targetEpisodeId: number) => {
      router.replace({
        pathname: '/watch/anime/[animeId]/[episodeId]',
        params: {
          animeId: String(numericAnimeId),
          episodeId: String(targetEpisodeId),
          title,
          preferredDubbing: selectedDubbing,
        },
      });
    },
    [router, numericAnimeId, title, selectedDubbing],
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

  if (isLoading && !episode) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  if (!episode || isError) {
    return (
      <View style={styles.loader}>
        <Text style={styles.errorTitle}>Нет источника видео</Text>
        <Text style={styles.errorMeta}>
          {isError ? 'Не удалось загрузить эпизод' : 'Эпизод не найден'}
        </Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Назад</Text>
        </Pressable>
      </View>
    );
  }

  if (!selectedDubbing || !dubbingOptionsList.length) {
    return (
      <View style={styles.loader}>
        {videos.length === 0 ? (
          <>
            <Text style={styles.errorTitle}>Нет источника видео</Text>
            <Text style={styles.errorMeta}>Для этого эпизода пока нет доступных озвучек</Text>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>Назад</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator color={colors.brand} size="large" />
        )}
      </View>
    );
  }

  if (!src) {
    return (
      <View style={styles.loader}>
        <Text style={styles.errorTitle}>Нет источника видео</Text>
        <Text style={styles.errorMeta}>Для выбранной озвучки нет доступного качества</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Назад</Text>
        </Pressable>
      </View>
    );
  }

  const dubbingOptions =
    dubbingOptionsList.length > 1
      ? dubbingOptionsList.map((label) => ({
          id: label,
          label,
          selected: label === selectedDubbing,
          onSelect: () =>
            switchWithResume(() => {
              setSelectedDubbing(label);
              void saveAnimeLastDubbing(numericAnimeId, label);
            }),
        }))
      : undefined;

  const qualityOptions =
    qualityOptionsList.length > 1
      ? qualityOptionsList.map((label) => ({
          id: label,
          label,
          selected: label === selectedQuality,
          onSelect: () => switchWithResume(() => setSelectedQuality(label)),
        }))
      : undefined;

  return (
    <View style={styles.playerRoot}>
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
        episodeNav={{
          items: episodeNav.items,
          currentEpisodeId: numericEpisodeId,
          hasPrevious: episodeNav.hasPrevious,
          hasNext: episodeNav.hasNext,
          onPrevious: episodeNav.previous
            ? () => navigateToEpisode(episodeNav.previous!.id)
            : undefined,
          onNext: episodeNav.next ? () => navigateToEpisode(episodeNav.next!.id) : undefined,
          onSelect: (id) => {
            if (id !== numericEpisodeId) navigateToEpisode(id);
          },
        }}
        onAutoPlayNext={
          episodeNav.next ? () => navigateToEpisode(episodeNav.next!.id) : undefined
        }
        onProgress={(current, duration) => {
          playbackTimeRef.current = current;
          syncProgress(current, duration);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  playerRoot: { flex: 1, backgroundColor: '#000' },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  errorTitle: { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  errorMeta: { color: colors.textSecondary, fontSize: 16, textAlign: 'center' },
  backBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.bgElevated,
  },
  backText: { color: colors.text, fontSize: 18, fontWeight: '600' },
});
