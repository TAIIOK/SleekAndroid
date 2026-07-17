import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { fetchAnimeDetail, fetchAnimeRelated } from '@/api/catalog';
import {
  fetchSavedAnimeLibrary,
  toggleAnimeFavorite,
  updateLibraryAnimeStatus,
} from '@/api/library';
import { fetchAnimeProgress } from '@/api/progress';
import { AnimeDetailEpisodes } from '@/components/anime/AnimeDetailEpisodes';
import { AnimeDetailHero } from '@/components/anime/AnimeDetailHero';
import { AnimeDetailPlot } from '@/components/anime/AnimeDetailPlot';
import { AnimeDetailSidebar } from '@/components/anime/AnimeDetailSidebar';
import { AnimeDetailSkeleton } from '@/components/anime/AnimeDetailSkeleton';
import { colors, spacing } from '@/constants/aniverse';
import { useAccumulatedEpisodes } from '@/hooks/useAccumulatedEpisodes';
import { useResumeEpisode } from '@/hooks/useResumeEpisode';
import { extractRelatedItems, getUniqueDubbingOptions } from '@/lib/animeDetail';
import type { UserListStatus } from '@/lib/libraryStatus';
import { buildAnimePlaybackState } from '@/lib/progressUtils';
import { useAuth } from '@/providers/AuthProvider';
import { pickPlaybackUrl } from '@aniverse/playback';
import type { AnimeEpisode } from '@aniverse/types';

const DEFAULT_QUALITY = '720p' as const;

export default function AnimeDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const useWideLayout = Platform.isTV || width >= 960;
  const { id } = useLocalSearchParams<{ id: string }>();
  const animeId = Number(id);
  const { isAuthenticated } = useAuth();

  const {
    episodes: allEpisodes,
    hasMore,
    loadMore,
    isFetchingMore,
    isLoading: episodesLoading,
  } = useAccumulatedEpisodes(animeId);

  const {
    data: detail,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['anime', animeId],
    queryFn: () => fetchAnimeDetail(animeId),
    enabled: Number.isFinite(animeId),
  });

  const { data: savedAnime = [] } = useQuery({
    queryKey: ['library-anime'],
    queryFn: fetchSavedAnimeLibrary,
    enabled: isAuthenticated,
  });

  const { data: animeProgress = [] } = useQuery({
    queryKey: ['anime-progress', animeId],
    queryFn: () => fetchAnimeProgress(animeId),
    enabled: isAuthenticated && Number.isFinite(animeId),
  });

  const savedState = useMemo(
    () => buildAnimePlaybackState(savedAnime, animeId, animeProgress),
    [savedAnime, animeId, animeProgress],
  );

  const { resumeEpisode, isLoading: resumeLoading } = useResumeEpisode(
    animeId,
    savedState.lastEpisodeId,
  );

  const { data: related = [], isLoading: relatedLoading } = useQuery({
    queryKey: ['anime-related', animeId],
    queryFn: () => fetchAnimeRelated(animeId),
    enabled: Number.isFinite(animeId),
  });

  const relatedItems = useMemo(
    () => extractRelatedItems(related, animeId, false),
    [related, animeId],
  );
  const recommendationItems = useMemo(
    () => extractRelatedItems(related, animeId, true),
    [related, animeId],
  );

  const activeDubbing = useMemo(() => {
    const first = allEpisodes[0]?.video ?? [];
    return getUniqueDubbingOptions(first)[0] || 'Не указана';
  }, [allEpisodes]);

  const invalidateLibrary = () => {
    void queryClient.invalidateQueries({ queryKey: ['library-anime'] });
    void queryClient.invalidateQueries({ queryKey: ['library-favorites'] });
  };

  const playEpisode = (episode: AnimeEpisode, startProgress?: number) => {
    const videos = episode.video ?? [];
    const url = pickPlaybackUrl(videos, activeDubbing, DEFAULT_QUALITY);
    if (!url) return;
    router.push({
      pathname: '/watch/anime/[animeId]/[episodeId]',
      params: {
        animeId: String(animeId),
        episodeId: String(episode.id),
        title: detail?.title ?? '',
        preferredDubbing: activeDubbing,
        ...(startProgress != null ? { startProgress: String(startProgress) } : {}),
      },
    });
  };

  const playResume = () => {
    if (!resumeEpisode) return;
    const progress = savedState.progressByEpisodeId[resumeEpisode.id];
    playEpisode(
      resumeEpisode,
      progress && progress > 0.01 && progress < 0.98 ? progress : undefined,
    );
  };

  const onStatusChange = (status: UserListStatus) => {
    if (!isAuthenticated) return;
    void updateLibraryAnimeStatus(animeId, status).then(invalidateLibrary);
  };

  const onToggleFavorite = () => {
    if (!isAuthenticated) return;
    void toggleAnimeFavorite(
      animeId,
      savedState.isFavorite,
      savedState.userStatus,
    ).then(invalidateLibrary);
  };

  if (isLoading) return <AnimeDetailSkeleton />;

  if (isError || !detail) {
    return (
      <View style={styles.loader}>
        <Text style={styles.errorTitle}>Не удалось загрузить</Text>
        <Text style={styles.errorBody}>Проверьте подключение или попробуйте позже</Text>
      </View>
    );
  }

  const mainColumn = (
    <View style={styles.main}>
      <AnimeDetailPlot detail={detail} />
      <AnimeDetailEpisodes
        episodes={allEpisodes}
        isLoading={episodesLoading}
        isFetchingMore={isFetchingMore}
        hasMore={hasMore}
        onLoadMore={loadMore}
        progressByEpisodeId={savedState.progressByEpisodeId}
        onPlay={(episode) => {
          const progress = savedState.progressByEpisodeId[episode.id];
          playEpisode(
            episode,
            progress && progress > 0.01 && progress < 0.98 ? progress : undefined,
          );
        }}
      />
    </View>
  );

  const sidebar = (
    <AnimeDetailSidebar
      detail={detail}
      episodesTotal={detail.episodesTotal}
      similarItems={relatedItems}
      recommendationItems={recommendationItems}
      similarLoading={relatedLoading}
    />
  );

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <AnimeDetailHero
        detail={detail}
        resumeEpisode={resumeEpisode}
        resumeLoading={resumeLoading}
        hasHistory={savedState.hasHistory}
        lastProgress={savedState.lastProgress}
        userStatus={savedState.userStatus}
        isFavorite={savedState.isFavorite}
        libraryDisabled={!isAuthenticated}
        onPlay={playResume}
        onStatusChange={onStatusChange}
        onToggleFavorite={onToggleFavorite}
      />

      <View style={[styles.grid, !useWideLayout && styles.stacked]}>
        {mainColumn}
        {sidebar}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: Platform.isTV ? spacing.xxl : spacing.lg,
    gap: spacing.xl,
    paddingBottom: spacing.xxl * 2,
  },
  grid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xl,
  },
  stacked: {
    flexDirection: 'column',
  },
  main: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xl,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  errorBody: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
