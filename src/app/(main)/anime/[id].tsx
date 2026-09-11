import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  fetchAnimeCharacters,
  fetchAnimeDetail,
  fetchAnimeRelated,
  fetchAnimeSimilar,
} from '@/api/catalog';
import {
  fetchSavedAnimeLibrary,
  toggleAnimeFavorite,
  updateLibraryAnimeStatus,
} from '@/api/library';
import { fetchAnimeProgress } from '@/api/progress';
import { AnimeDetailCharacters } from '@/components/anime/AnimeDetailCharacters';
import { AnimeDetailEpisodes } from '@/components/anime/AnimeDetailEpisodes';
import { AnimeDetailHero } from '@/components/anime/AnimeDetailHero';
import { AnimeDetailSidebar } from '@/components/anime/AnimeDetailSidebar';
import { AnimeDetailSkeleton } from '@/components/anime/AnimeDetailSkeleton';
import { DetailCollapsibleSection } from '@/components/catalog/DetailCollapsibleSection';
import { MobileDetailBackButton } from '@/components/navigation/MobileDetailBackButton';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, spacing } from '@/constants/aniverse';
import { useAccumulatedEpisodes } from '@/hooks/useAccumulatedEpisodes';
import { useExclusiveDetailSection } from '@/hooks/useExclusiveDetailSection';
import { useResumeEpisode } from '@/hooks/useResumeEpisode';
import {
  excludeRelatedFromSimilar,
  extractRelatedItems,
  sortAnimeItemsByYear,
} from '@/lib/animeDetail';
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const animeId = Number(id);
  const { isAuthenticated } = useAuth();
  const { openId, toggle: toggleSection } = useExclusiveDetailSection();

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

  const { data: related = [], isFetching: relatedFetching, isFetched: relatedFetched } = useQuery({
    queryKey: ['anime-related', animeId],
    queryFn: () => fetchAnimeRelated(animeId),
    enabled:
      Number.isFinite(animeId) &&
      (openId === 'related' || openId === 'recommendations'),
  });

  const { data: similar = [], isFetching: similarFetching, isFetched: similarFetched } = useQuery({
    queryKey: ['anime-similar', animeId],
    queryFn: () => fetchAnimeSimilar(animeId),
    enabled: Number.isFinite(animeId) && openId === 'similar',
  });

  const { data: characters = [], isFetching: charactersFetching, isFetched: charactersFetched } = useQuery({
    queryKey: ['anime-characters', animeId],
    queryFn: () => fetchAnimeCharacters(animeId),
    enabled: Number.isFinite(animeId) && openId === 'characters',
  });

  const relatedItems = useMemo(
    () => sortAnimeItemsByYear(extractRelatedItems(related, animeId, false)),
    [related, animeId],
  );
  const recommendationItems = useMemo(
    () => extractRelatedItems(related, animeId, true),
    [related, animeId],
  );
  const similarItems = useMemo(
    () => excludeRelatedFromSimilar(similar, relatedItems),
    [similar, relatedItems],
  );

  const allVideos = useMemo(
    () => allEpisodes.flatMap((episode) => episode.video ?? []),
    [allEpisodes],
  );
  const dubbingOptions = useMemo(() => getUniqueDubbingOptions(allVideos), [allVideos]);
  const [watchedDubbing, setWatchedDubbing] = useState<string | null>(null);
  const [selectedDubbing, setSelectedDubbing] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!Number.isFinite(animeId)) return;
      let cancelled = false;
      void loadAnimeLastDubbing(animeId).then((value) => {
        if (!cancelled) setWatchedDubbing(value);
      });
      return () => {
        cancelled = true;
      };
    }, [animeId]),
  );

  useEffect(() => {
    if (!dubbingOptions.length) {
      setSelectedDubbing('');
      return;
    }
    setSelectedDubbing((current) => {
      if (watchedDubbing && dubbingOptions.includes(watchedDubbing)) return watchedDubbing;
      if (current && dubbingOptions.includes(current)) return current;
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

  const onSelectDubbing = useCallback((value: string) => {
    setSelectedDubbing(value);
    void saveAnimeLastDubbing(animeId, value).then(() => setWatchedDubbing(value));
  }, [animeId]);

  const invalidateLibrary = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['library-anime'] });
    void queryClient.invalidateQueries({ queryKey: ['library-favorites'] });
  }, [queryClient]);

  const playEpisode = useCallback((episode: AnimeEpisode, startProgress?: number) => {
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
  }, [activeDubbing, animeId, detail?.title, router]);

  const playResume = useCallback(() => {
    if (!resumeEpisode) return;
    const progress = savedState.progressByEpisodeId[resumeEpisode.id];
    playEpisode(
      resumeEpisode,
      progress && progress > 0.01 && progress < 0.98 ? progress : undefined,
    );
  }, [playEpisode, resumeEpisode, savedState.progressByEpisodeId]);

  const onStatusChange = useCallback((status: UserListStatus) => {
    if (!isAuthenticated) return;
    void updateLibraryAnimeStatus(animeId, status).then(invalidateLibrary);
  }, [animeId, invalidateLibrary, isAuthenticated]);

  const onToggleFavorite = useCallback(() => {
    if (!isAuthenticated) return;
    void toggleAnimeFavorite(
      animeId,
      savedState.isFavorite,
      savedState.userStatus,
    ).then(invalidateLibrary);
  }, [animeId, invalidateLibrary, isAuthenticated, savedState.isFavorite, savedState.userStatus]);

  const progressByEpisodeIdRef = useRef(savedState.progressByEpisodeId);
  progressByEpisodeIdRef.current = savedState.progressByEpisodeId;

  const onPlayEpisode = useCallback((episode: AnimeEpisode) => {
    const progress = progressByEpisodeIdRef.current[episode.id];
    playEpisode(
      episode,
      progress && progress > 0.01 && progress < 0.98 ? progress : undefined,
    );
  }, [playEpisode]);

  const collectionItem = useMemo(
    () =>
      detail
        ? {
            mediaType: 'anime' as const,
            mediaId: String(animeId),
            title: detail.title ?? undefined,
            poster: animePoster(detail),
          }
        : null,
    [animeId, detail],
  );

  const sidebar = (
    <AnimeDetailSidebar
      relatedItems={relatedItems}
      recommendationItems={recommendationItems}
      similarItems={similarItems}
      relatedLoading={relatedFetching}
      similarLoading={similarFetching}
      relatedFetched={relatedFetched}
      similarFetched={similarFetched}
      openId={openId}
      onToggle={toggleSection}
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
      onSelectDubbing={onSelectDubbing}
      filteredEmptyWhileLoading={filteredEmptyWhileLoading}
    />
  );

  // Episodes right under hero; extra sections stay collapsed until opened.
  const body = (
    <View style={styles.stack}>
      {episodesBlock}
      <DetailCollapsibleSection
        title="Персонажи"
        expanded={openId === 'characters'}
        onToggle={() => toggleSection('characters')}
        loading={openId === 'characters' && characters.length === 0 && (charactersFetching || !charactersFetched)}
        empty={openId === 'characters' && charactersFetched && characters.length === 0}
      >
        <AnimeDetailCharacters hideTitle characters={characters} loading={charactersFetching} />
      </DetailCollapsibleSection>
      {sidebar}
    </View>
  );

  // Single root so the back control never unmounts across skeleton → content.
  let main: ReactNode;
  if (isLoading) {
    main = <AnimeDetailSkeleton />;
  } else if (isError || !detail) {
    main = (
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
  } else {
    main = (
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
          collectionItem={collectionItem}
          onPlay={playResume}
          onStatusChange={onStatusChange}
          onToggleFavorite={onToggleFavorite}
        />
        {body}
      </ScrollView>
    );
  }

  return (
    <View style={styles.root} collapsable={false}>
      {main}
      <MobileDetailBackButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: {
    // flexGrow:0 — never stretch ScrollView children to the viewport (pushes body down).
    flexGrow: 0,
    padding: isTvUi() ? spacing.lg : spacing.md,
    gap: isTvUi() ? spacing.sm : spacing.sm,
    paddingBottom: isTvUi() ? spacing.xl : spacing.xxl,
  },
  stack: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: isTvUi() ? spacing.md : spacing.sm,
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
