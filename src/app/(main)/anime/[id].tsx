import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { fetchAnimeCharacters, fetchAnimeDetail, fetchAnimeRelated } from '@/api/catalog';
import {
  fetchSavedAnimeLibrary,
  toggleAnimeFavorite,
  updateLibraryAnimeStatus,
} from '@/api/library';
import { fetchAnimeProgress } from '@/api/progress';
import { AnimeDetailCharacters } from '@/components/anime/AnimeDetailCharacters';
import { AnimeDetailEpisodes } from '@/components/anime/AnimeDetailEpisodes';
import { AnimeDetailHero } from '@/components/anime/AnimeDetailHero';
import { AnimeDetailPlot } from '@/components/anime/AnimeDetailPlot';
import { AnimeDetailSidebar } from '@/components/anime/AnimeDetailSidebar';
import { AnimeDetailSkeleton } from '@/components/anime/AnimeDetailSkeleton';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, spacing } from '@/constants/aniverse';
import { useAccumulatedEpisodes } from '@/hooks/useAccumulatedEpisodes';
import { useResumeEpisode } from '@/hooks/useResumeEpisode';
import { extractRelatedItems } from '@/lib/animeDetail';
import { loadAnimeLastDubbing, saveAnimeLastDubbing } from '@/lib/animeLastDubbing';
import {
  filterEpisodesByDubbing,
  getUniqueDubbingOptions,
  pickBestDubbingOption,
} from '@/lib/animePlaybackOptions';
import type { UserListStatus } from '@/lib/libraryStatus';
import { animePoster } from '@/lib/poster';
import { buildAnimePlaybackState } from '@/lib/progressUtils';
import { useAuth } from '@/providers/AuthProvider';
import { pickPlaybackUrl } from '@aniverse/playback';
import type { AnimeEpisode } from '@aniverse/types';
import { isTvUi } from '@/lib/isTvUi';

const DEFAULT_QUALITY = '720p' as const;

export default function AnimeDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  // Site desktop/TV: plot + «Похожее» side-by-side. Phone stays stacked unless wide tablet.
  const useWideLayout = isTvUi() || width >= 960;
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
    refetch,
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

  const { data: characters = [], isLoading: charactersLoading } = useQuery({
    queryKey: ['anime-characters', animeId],
    queryFn: () => fetchAnimeCharacters(animeId),
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

  const allVideos = useMemo(
    () => allEpisodes.flatMap((episode) => episode.video ?? []),
    [allEpisodes],
  );
  const dubbingOptions = useMemo(() => getUniqueDubbingOptions(allVideos), [allVideos]);
  const [watchedDubbing, setWatchedDubbing] = useState<string | null>(null);
  const [selectedDubbing, setSelectedDubbing] = useState('');

  useEffect(() => {
    if (!Number.isFinite(animeId)) return;
    let cancelled = false;
    void loadAnimeLastDubbing(animeId).then((value) => {
      if (!cancelled) setWatchedDubbing(value);
    });
    return () => {
      cancelled = true;
    };
  }, [animeId]);

  useEffect(() => {
    if (!dubbingOptions.length) {
      setSelectedDubbing('');
      return;
    }
    setSelectedDubbing((current) => {
      if (current && dubbingOptions.includes(current)) return current;
      if (watchedDubbing && dubbingOptions.includes(watchedDubbing)) return watchedDubbing;
      return pickBestDubbingOption(allVideos) ?? dubbingOptions[0];
    });
  }, [dubbingOptions, watchedDubbing, allVideos]);

  const activeDubbing = selectedDubbing || dubbingOptions[0] || 'Не указана';
  const filteredEpisodes = useMemo(
    () => filterEpisodesByDubbing(allEpisodes, activeDubbing),
    [allEpisodes, activeDubbing],
  );
  const filteredEmptyWhileLoading =
    Boolean(activeDubbing) &&
    allEpisodes.length > 0 &&
    filteredEpisodes.length === 0 &&
    (hasMore || isFetchingMore || episodesLoading);

  const onSelectDubbing = (value: string) => {
    setSelectedDubbing(value);
    void saveAnimeLastDubbing(animeId, value).then(() => setWatchedDubbing(value));
  };

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
        <TvFocusable
          hasTVPreferredFocus={isTvUi()}
          onPress={() => {
            void refetch();
          }}
          style={styles.retryBtn}
        >
          <Text style={styles.retryLabel}>Повторить</Text>
        </TvFocusable>
      </View>
    );
  }

  const onPlayEpisode = (episode: AnimeEpisode) => {
    const progress = savedState.progressByEpisodeId[episode.id];
    playEpisode(
      episode,
      progress && progress > 0.01 && progress < 0.98 ? progress : undefined,
    );
  };

  const sidebar = (
    <AnimeDetailSidebar
      similarItems={relatedItems}
      recommendationItems={recommendationItems}
      similarLoading={relatedLoading}
    />
  );

  const episodesBlock = (
    <AnimeDetailEpisodes
      episodes={filteredEpisodes}
      isLoading={episodesLoading}
      isFetchingMore={isFetchingMore}
      hasMore={hasMore}
      onLoadMore={loadMore}
      progressByEpisodeId={savedState.progressByEpisodeId}
      onPlay={onPlayEpisode}
      dubbingOptions={dubbingOptions}
      selectedDubbing={activeDubbing}
      watchedDubbing={watchedDubbing}
      onSelectDubbing={onSelectDubbing}
      filteredEmptyWhileLoading={filteredEmptyWhileLoading}
    />
  );

  // Episodes right under hero; then plot | similar. Genres live in hero pills only.
  const body = useWideLayout ? (
    <View style={styles.stack}>
      {episodesBlock}
      <View style={styles.wideGrid}>
        <View style={styles.wideMain}>
          <AnimeDetailPlot detail={detail} />
          <AnimeDetailCharacters characters={characters} loading={charactersLoading} />
        </View>
        <View style={styles.wideSide}>{sidebar}</View>
      </View>
    </View>
  ) : (
    <View style={styles.stack}>
      {episodesBlock}
      <AnimeDetailPlot detail={detail} />
      <AnimeDetailCharacters characters={characters} loading={charactersLoading} />
      {sidebar}
    </View>
  );

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      nestedScrollEnabled
    >
      <AnimeDetailHero
        detail={detail}
        resumeEpisode={resumeEpisode}
        resumeLoading={resumeLoading}
        hasHistory={savedState.hasHistory}
        lastProgress={savedState.lastProgress}
        episodesTotal={detail.episodesTotal}
        userStatus={savedState.userStatus}
        isFavorite={savedState.isFavorite}
        libraryDisabled={!isAuthenticated}
        collectionItem={{
          mediaType: 'anime',
          mediaId: String(animeId),
          title: detail.title ?? undefined,
          poster: animePoster(detail),
        }}
        onPlay={playResume}
        onStatusChange={onStatusChange}
        onToggleFavorite={onToggleFavorite}
      />
      {body}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: {
    // flexGrow:0 — never stretch ScrollView children to the viewport (pushes body down).
    flexGrow: 0,
    padding: isTvUi() ? spacing.lg : spacing.md,
    gap: isTvUi() ? spacing.sm : spacing.md,
    paddingBottom: isTvUi() ? spacing.xl : spacing.xxl,
  },
  stack: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: spacing.md,
  },
  wideGrid: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
  },
  wideMain: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    gap: spacing.md,
  },
  wideSide: {
    width: isTvUi() ? 300 : 280,
    flexGrow: 0,
    flexShrink: 0,
    gap: spacing.md,
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
  retryBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.brandAccent,
  },
  retryLabel: {
    color: colors.text,
    fontWeight: '700',
    fontSize: isTvUi() ? 18 : 15,
  },
});
