import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { fetchLampaDetail, mapLampaToRailItem, type LampaItem } from '@/api/catalog';
import {
  fetchSavedLampaLibrary,
  toggleLampaFavorite,
  updateLibraryLampaStatus,
} from '@/api/library';
import {
  fetchLampaCast,
  fetchLampaRecommendations,
  fetchLampaRelated,
  fetchLampaSimilar,
} from '@/api/lampaExtras';
import { fetchLampaExternalRatings } from '@/api/lampaRatings';
import { fetchLampaProgress } from '@/api/progress';
import { fetchActivityHistory } from '@/api/user';
import { LazyCatalogRail } from '@/components/catalog/LazyCatalogRail';
import { PosterRail } from '@/components/catalog/PosterRail';
import { LampaDetailCast } from '@/components/lampa/detail/LampaDetailCast';
import { LampaDetailHero } from '@/components/lampa/detail/LampaDetailHero';
import { LampaDetailPlot } from '@/components/lampa/detail/LampaDetailPlot';
import { LampaDetailSeasons } from '@/components/lampa/detail/LampaDetailSeasons';
import { LampaDetailSkeleton } from '@/components/lampa/detail/LampaDetailSkeleton';
import { LampaSourceSheet } from '@/components/lampa/LampaSourceSheet';
import { MobileDetailBackButton } from '@/components/navigation/MobileDetailBackButton';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, layout, spacing } from '@/constants/aniverse';
import { useBelowFoldReady } from '@/hooks/useBelowFoldReady';
import {
  excludeRelatedLampaItems,
  lampaCardSubtitle,
  lampaCollectionId,
  lampaDetailPath,
  lampaTitle,
  parseLampaSeasons,
  resolveLampaTmdbId,
} from '@/lib/lampaDetail';
import type { UserListStatus } from '@/lib/libraryStatus';
import { lampaPosterPath } from '@/lib/poster';
import { buildLampaPlaybackState, isUnfinishedProgress } from '@/lib/progressUtils';
import {
  lampaWatchHistoryKey,
  rememberWatchHistoryMeta,
} from '@/lib/watchHistoryMeta';
import { resumeLampaFromLastSelection } from '@/lib/resumeLampaPlayback';
import { useAuth } from '@/providers/AuthProvider';
import { isTvUi } from '@/lib/isTvUi';
import { notifyViewportScroll } from '@/lib/viewportScroll';

function parseOptionalNumber(value?: string): number | undefined {
  if (value == null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function LampaDetailView({ kind }: { kind: 'movie' | 'tv' }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id, resume, season, episode, startProgress } = useLocalSearchParams<{
    id: string;
    resume?: string;
    season?: string;
    episode?: string;
    startProgress?: string;
  }>();
  const routeId = String(id ?? '');
  const { isAuthenticated } = useAuth();
  const isSerial = kind === 'tv';
  const belowFoldReady = useBelowFoldReady();
  const resumeSeason = parseOptionalNumber(Array.isArray(season) ? season[0] : season);
  const resumeEpisode = parseOptionalNumber(Array.isArray(episode) ? episode[0] : episode);
  const resumeStartProgress = parseOptionalNumber(
    Array.isArray(startProgress) ? startProgress[0] : startProgress,
  );
  const shouldAutoResume =
    isTvUi() && String(Array.isArray(resume) ? resume[0] : resume ?? '') === '1';

  const [sheetOpen, setSheetOpen] = useState(false);
  const [pickerSeason, setPickerSeason] = useState<number | undefined>();
  const [pickerEpisode, setPickerEpisode] = useState<number | undefined>();
  const [autoPlayPreferred, setAutoPlayPreferred] = useState(false);
  const [resuming, setResuming] = useState(shouldAutoResume);
  const resumeAttemptedRef = useRef<string | null>(null);
  const watchInFlightRef = useRef(false);

  const {
    data: detail,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['lampa', kind, routeId],
    queryFn: () => fetchLampaDetail(kind, routeId),
    enabled: !!routeId,
  });

  // Same query keys as Continue Watching so detail reuses the home cache.
  const { data: savedLampa = [] } = useQuery({
    queryKey: ['library-lampa', 'include-lampa'],
    queryFn: fetchSavedLampaLibrary,
    enabled: isAuthenticated,
  });

  const lampaObjectId = useMemo(() => {
    if (!detail) return '';
    const d = detail as unknown as Record<string, unknown>;
    return String(d.objectId ?? d.object_id ?? '').trim();
  }, [detail]);

  useEffect(() => {
    if (!detail || !routeId) return;
    const meta = {
      title: lampaTitle(detail),
      poster: lampaPosterPath(detail),
      kind,
    };
    rememberWatchHistoryMeta(lampaWatchHistoryKey(routeId), meta);
    if (lampaObjectId) {
      rememberWatchHistoryMeta(lampaWatchHistoryKey(lampaObjectId), meta);
    }
  }, [detail, kind, lampaObjectId, routeId]);

  // Unfiltered list (same as CW). Filtered `?lampaId=` can miss rows keyed under
  // a sibling id (UUID vs TMDB) even when Home already has them.
  const { data: lampaProgress = [] } = useQuery({
    queryKey: ['lampa-progress'],
    queryFn: () => fetchLampaProgress(),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const { data: historyFeed = [] } = useQuery({
    queryKey: ['history-feed'],
    queryFn: fetchActivityHistory,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const savedState = useMemo(
    () =>
      detail
        ? buildLampaPlaybackState(
            savedLampa,
            detail,
            lampaProgress,
            routeId,
            historyFeed,
          )
        : null,
    [savedLampa, detail, lampaProgress, routeId, historyFeed],
  );

  const tmdbId = useMemo(
    () => (detail ? resolveLampaTmdbId(detail, routeId) : undefined),
    [detail, routeId],
  );
  const collectionId = useMemo(
    () => (detail ? lampaCollectionId(detail) : undefined),
    [detail],
  );

  const { data: similar = [], isLoading: similarLoading } = useQuery({
    queryKey: ['lampa-similar', kind, tmdbId ?? 0],
    queryFn: () => fetchLampaSimilar(kind, tmdbId!),
    enabled: belowFoldReady && tmdbId != null,
  });

  const { data: recommendations = [], isLoading: recommendationsLoading } = useQuery({
    queryKey: ['lampa-recommendations', kind, tmdbId ?? 0],
    queryFn: () => fetchLampaRecommendations(kind, tmdbId!),
    enabled: belowFoldReady && tmdbId != null,
  });

  const { data: franchise = [], isLoading: franchiseLoading } = useQuery({
    queryKey: ['lampa-related', kind, tmdbId ?? 0],
    queryFn: () => fetchLampaRelated(kind, tmdbId!, collectionId),
    enabled: belowFoldReady && tmdbId != null && collectionId != null,
  });

  const similarItems = useMemo(
    () => excludeRelatedLampaItems(similar, franchise),
    [similar, franchise],
  );

  const { data: cast = [], isLoading: castLoading } = useQuery({
    queryKey: ['lampa-cast', kind, tmdbId ?? 0],
    queryFn: () => fetchLampaCast(kind, tmdbId!),
    enabled: belowFoldReady && tmdbId != null,
  });

  const { data: externalRatings = [] } = useQuery({
    queryKey: ['lampa-ratings', kind, tmdbId ?? 0],
    queryFn: () => fetchLampaExternalRatings(kind, tmdbId!, detail),
    enabled: belowFoldReady && tmdbId != null && !!detail,
  });

  const invalidateLibrary = () => {
    void queryClient.invalidateQueries({ queryKey: ['library-lampa'] });
    void queryClient.invalidateQueries({ queryKey: ['library-favorites'] });
  };

  const openSources = useCallback((preferResume: boolean) => {
    if (preferResume && (savedState?.hasHistory || resumeSeason != null || resumeEpisode != null)) {
      setPickerSeason(resumeSeason ?? savedState?.lastSeason ?? 1);
      setPickerEpisode(resumeEpisode ?? savedState?.lastEpisode ?? 1);
      setAutoPlayPreferred(true);
    } else {
      setPickerSeason(undefined);
      setPickerEpisode(undefined);
      setAutoPlayPreferred(false);
    }
    setSheetOpen(true);
  }, [resumeEpisode, resumeSeason, savedState]);

  const attemptResumeThenPlayOrSheet = useCallback(
    async (preferSheetResume: boolean) => {
      if (watchInFlightRef.current || !detail || !routeId) return;
      watchInFlightRef.current = true;
      setResuming(true);
      try {
        const started = await resumeLampaFromLastSelection({
          kind,
          routeId,
          season: resumeSeason ?? savedState?.lastSeason,
          episode: resumeEpisode ?? savedState?.lastEpisode,
          startProgress: resumeStartProgress ?? savedState?.lastProgress,
          lampaObjectId: lampaObjectId || undefined,
          detail,
        });
        if (started) {
          router.push('/watch/lampa');
          return;
        }
        openSources(preferSheetResume);
      } finally {
        watchInFlightRef.current = false;
        setResuming(false);
      }
    },
    [
      detail,
      kind,
      lampaObjectId,
      openSources,
      resumeEpisode,
      resumeSeason,
      resumeStartProgress,
      routeId,
      router,
      savedState?.lastEpisode,
      savedState?.lastProgress,
      savedState?.lastSeason,
    ],
  );

  useEffect(() => {
    if (!shouldAutoResume || !detail || !routeId) return;
    const signature = `${kind}|${routeId}`;
    if (resumeAttemptedRef.current === signature) return;
    resumeAttemptedRef.current = signature;
    router.setParams({ resume: undefined });
    void attemptResumeThenPlayOrSheet(true);
  }, [attemptResumeThenPlayOrSheet, detail, kind, routeId, router, shouldAutoResume]);

  const canSilentResume = isUnfinishedProgress(
    resumeStartProgress ?? savedState?.lastProgress ?? 0,
  );

  const onWatch = () => {
    // iOS parity: silent resume only when there is real unfinished progress.
    // First watch («Смотреть сейчас») must open the source sheet — not auto-pick
    // the first WatchHub source / dub / quality behind «Возобновление просмотра».
    if (isTvUi() && canSilentResume) {
      void attemptResumeThenPlayOrSheet(true);
      return;
    }
    openSources(!!savedState?.hasHistory);
  };

  const onSelectEpisode = (season: number, episode: number) => {
    setPickerSeason(season);
    setPickerEpisode(episode);
    setAutoPlayPreferred(true);
    setSheetOpen(true);
  };

  const libraryId = lampaObjectId || routeId;

  const onStatusChange = (status: UserListStatus) => {
    if (!isAuthenticated || !libraryId) return;
    void updateLibraryLampaStatus(libraryId, status).then(invalidateLibrary);
  };

  const onToggleFavorite = () => {
    if (!isAuthenticated || !libraryId) return;
    void toggleLampaFavorite(
      libraryId,
      savedState?.isFavorite ?? false,
      savedState?.status,
    ).then(invalidateLibrary);
  };

  const seasons = detail ? parseLampaSeasons(detail.seasons) : [];

  const openLampaItem = (itemId: string | number, itemKind: 'movie' | 'tv' = kind) => {
    const path = lampaDetailPath(itemKind, { id: itemId });
    if (!path.includes('/undefined') && !path.endsWith('/')) {
      router.push(path as '/movies/[id]');
    }
  };

  const toRailItems = (items: LampaItem[]) =>
    items.map((item) => ({
      ...mapLampaToRailItem(item),
      subtitle: lampaCardSubtitle(item),
    }));

  const openFromList = (items: LampaItem[], itemId: string | number) => {
    const source = items.find((row) => String(row.id) === String(itemId));
    const itemKind = source?.kind === 'tv' ? 'tv' : source?.kind === 'movie' ? 'movie' : kind;
    openLampaItem(itemId, itemKind);
  };

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    notifyViewportScroll(event.nativeEvent.contentOffset.y);
  }, []);

  const relatedRails = (
    <>
      {franchise.length > 0 || franchiseLoading ? (
        <LazyCatalogRail>
          <PosterRail
            title="Связанные"
            items={toRailItems(franchise)}
            loading={franchiseLoading}
            itemWidth={layout.posterWidthDetail}
            flush
            onItemPress={(item) => openFromList(franchise, item.id)}
          />
        </LazyCatalogRail>
      ) : null}
      {recommendations.length > 0 || recommendationsLoading ? (
        <LazyCatalogRail>
          <PosterRail
            title="Рекомендации"
            items={toRailItems(recommendations)}
            loading={recommendationsLoading}
            itemWidth={layout.posterWidthDetail}
            flush
            onItemPress={(item) => openFromList(recommendations, item.id)}
          />
        </LazyCatalogRail>
      ) : null}
      {similarItems.length > 0 || similarLoading ? (
        <LazyCatalogRail>
          <PosterRail
            title="Похожее"
            items={toRailItems(similarItems)}
            loading={similarLoading}
            itemWidth={layout.posterWidthDetail}
            flush
            onItemPress={(item) => openFromList(similarItems, item.id)}
          />
        </LazyCatalogRail>
      ) : null}
    </>
  );

  const resumeShell = (
    <View style={styles.loader}>
      {isTvUi() ? (
        <TvFocusable
          hasTVPreferredFocus
          railStart
          contentEntry
          accessibilityLabel="Возобновление просмотра"
          style={styles.resumeFocusTrap}
        >
          <View />
        </TvFocusable>
      ) : null}
      <ActivityIndicator color={colors.brand} size="large" />
      <Text style={styles.errorTitle}>Возобновление просмотра…</Text>
    </View>
  );

  let main: ReactNode;
  if (resuming && !isError) {
    main = resumeShell;
  } else if (isLoading) {
    main = <LampaDetailSkeleton />;
  } else if (isError || !detail) {
    main = (
      <View style={styles.loader}>
        <Text style={styles.errorTitle}>Не удалось загрузить</Text>
        <Text style={styles.errorBody}>Проверьте подключение или попробуйте позже</Text>
      </View>
    );
  } else {
    main = (
      <>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          onScroll={onScroll}
          scrollEventThrottle={64}
        >
          <LampaDetailHero
            detail={detail}
            kind={kind}
            isSerial={isSerial}
            hasHistory={savedState?.hasHistory ?? false}
            lastSeason={savedState?.lastSeason ?? 1}
            lastEpisode={savedState?.lastEpisode ?? 1}
            lastProgress={savedState?.lastProgress ?? 0}
            userStatus={savedState?.status}
            isFavorite={savedState?.isFavorite}
            libraryDisabled={!isAuthenticated}
            collectionItem={{
              mediaType: 'lampa',
              mediaId: `${kind}:${routeId}`,
              title: lampaTitle(detail),
              poster: lampaPosterPath(detail),
            }}
            onWatch={onWatch}
            onOpenSources={() => openSources(false)}
            onStatusChange={onStatusChange}
            onToggleFavorite={onToggleFavorite}
            externalRatings={externalRatings}
          />

          {isSerial && seasons.length > 0 ? (
            <LampaDetailSeasons
              seasons={seasons}
              tmdbId={tmdbId}
              episodeProgressByKey={savedState?.episodeProgressByKey}
              onSelectEpisode={onSelectEpisode}
            />
          ) : null}

          <View style={styles.stack}>
            <LampaDetailPlot detail={detail} />
            {castLoading || cast.length > 0 ? (
              <LazyCatalogRail placeholderMinHeight={180}>
                <LampaDetailCast cast={cast} loading={castLoading} />
              </LazyCatalogRail>
            ) : null}
          </View>
          <View style={styles.stack}>{relatedRails}</View>
        </ScrollView>
      </>
    );
  }

  return (
    <View style={styles.root} collapsable={false}>
      {main}
      {detail && !resuming ? (
        <LampaSourceSheet
          visible={sheetOpen}
          onClose={() => setSheetOpen(false)}
          detail={detail}
          kind={kind}
          routeId={routeId}
          lampaObjectId={lampaObjectId || undefined}
          initialSeason={isSerial ? pickerSeason : undefined}
          initialEpisode={isSerial ? pickerEpisode : undefined}
          autoPlayPreferredEpisode={autoPlayPreferred}
          episodeProgressByKey={savedState?.episodeProgressByKey}
        />
      ) : null}
      <MobileDetailBackButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: {
    flexGrow: 0,
    padding: isTvUi() ? spacing.lg : spacing.md,
    // Tighter gap under full-bleed hero so bottom fade blends into plot.
    gap: isTvUi() ? spacing.sm : spacing.md,
    paddingBottom: isTvUi() ? spacing.xl : spacing.xxl,
  },
  stack: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'stretch',
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
  resumeFocusTrap: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
