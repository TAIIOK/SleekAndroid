import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { attachLampaTmdbDetail, fetchLampaDetailBackendFirst, mapLampaToRailItem, type LampaItem } from '@/api/catalog';
import {
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
import { DetailPreviewRail } from '@/components/catalog/DetailPreviewRail';
import { type RailItem } from '@/components/catalog/PosterRail';
import { LampaDetailCast } from '@/components/lampa/detail/LampaDetailCast';
import { LampaDetailHero } from '@/components/lampa/detail/LampaDetailHero';
import { LampaDetailSeasons } from '@/components/lampa/detail/LampaDetailSeasons';
import { LampaDetailSkeleton } from '@/components/lampa/detail/LampaDetailSkeleton';
import { LampaSourceSheet } from '@/components/lampa/LampaSourceSheet';
import { MobileDetailBackButton } from '@/components/navigation/MobileDetailBackButton';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, spacing } from '@/constants/aniverse';
import { useBelowFoldReady } from '@/hooks/useBelowFoldReady';
import { useDetailLampaLibrary } from '@/hooks/useDetailLibrary';
import { useLampaDetailPlayback } from '@/hooks/useLampaDetailPlayback';
import { DETAIL_CAST_FETCH_LIMIT } from '@/lib/catalogRailPage';
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
import { explicitResumeProgress, isUnfinishedProgress } from '@/lib/progressUtils';
import {
  lampaWatchHistoryKey,
  rememberWatchHistoryMeta,
} from '@/lib/watchHistoryMeta';
import {
  formatLampaVoicePillLabel,
  loadLampaLastSelection,
} from '@/lib/lampaLastSelection';
import { resumeLampaFromLastSelection } from '@/lib/resumeLampaPlayback';
import { useAuth } from '@/providers/AuthProvider';
import { isTvUi } from '@/lib/isTvUi';
import {
  DETAIL_FOCUS_RECOMMENDATIONS,
  DETAIL_FOCUS_RELATED,
  DETAIL_FOCUS_SIMILAR,
  DetailFocusScope,
  detailFocusPath,
} from '@/lib/detailFocus';

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
  const [voiceLabel, setVoiceLabel] = useState('Озвучка');
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
    queryFn: () => fetchLampaDetailBackendFirst(kind, routeId),
    enabled: !!routeId,
  });

  const tmdbMergeKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!detail || !routeId || detail.tmdbMerged) return;
    const key = `${kind}:${routeId}`;
    if (tmdbMergeKeyRef.current === key) return;
    let cancelled = false;
    void attachLampaTmdbDetail(kind, routeId, detail).then((merged) => {
      if (cancelled) return;
      tmdbMergeKeyRef.current = key;
      queryClient.setQueryData(['lampa', kind, routeId], merged);
    });
    return () => {
      cancelled = true;
    };
  }, [detail, kind, queryClient, routeId]);

  const savedLampa = useDetailLampaLibrary(isAuthenticated);

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

  const savedState = useLampaDetailPlayback({
    enabled: isAuthenticated,
    detail,
    routeId,
    saved: savedLampa,
  });

  const tmdbId = useMemo(
    () => (detail ? resolveLampaTmdbId(detail, routeId) : undefined),
    [detail, routeId],
  );
  const collectionId = useMemo(
    () => (detail ? lampaCollectionId(detail) : undefined),
    [detail],
  );

  const { data: similar = [], isFetching: similarFetching } = useQuery({
    queryKey: ['lampa-similar', kind, tmdbId ?? 0],
    queryFn: () => fetchLampaSimilar(kind, tmdbId!),
    enabled: belowFoldReady && tmdbId != null,
  });

  const { data: recommendations = [], isFetching: recommendationsFetching } = useQuery({
    queryKey: ['lampa-recommendations', kind, tmdbId ?? 0],
    queryFn: () => fetchLampaRecommendations(kind, tmdbId!),
    enabled: belowFoldReady && tmdbId != null,
  });

  const { data: franchise = [], isFetching: franchiseFetching } = useQuery({
    queryKey: ['lampa-related', kind, tmdbId ?? 0],
    queryFn: () => fetchLampaRelated(kind, tmdbId!, collectionId),
    enabled: belowFoldReady && tmdbId != null,
  });

  const similarItems = useMemo(
    () => excludeRelatedLampaItems(similar, franchise),
    [similar, franchise],
  );

  const { data: cast = [], isFetching: castFetching } = useQuery({
    queryKey: ['lampa-cast', kind, tmdbId ?? 0, DETAIL_CAST_FETCH_LIMIT],
    queryFn: () => fetchLampaCast(kind, tmdbId!, DETAIL_CAST_FETCH_LIMIT),
    enabled: belowFoldReady && tmdbId != null,
  });

  const { data: externalRatings } = useQuery({
    queryKey: ['lampa-ratings', kind, tmdbId ?? 0],
    queryFn: () => fetchLampaExternalRatings(kind, tmdbId!, detail),
    enabled: belowFoldReady && tmdbId != null && !!detail,
  });

  const invalidateLibrary = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['library-lampa'] });
    void queryClient.invalidateQueries({ queryKey: ['library-favorites'] });
  }, [queryClient]);

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

  const canSilentResume =
    isUnfinishedProgress(resumeStartProgress ?? savedState?.lastProgress ?? 0) ||
    explicitResumeProgress(resumeStartProgress ?? 0) != null;

  const onWatch = useCallback(() => {
    // iOS parity: silent resume only when there is real unfinished progress.
    // First watch («Смотреть сейчас») must open the source sheet — not auto-pick
    // the first WatchHub source / dub / quality behind «Возобновление просмотра».
    if (isTvUi() && canSilentResume) {
      void attemptResumeThenPlayOrSheet(true);
      return;
    }
    openSources(!!savedState?.hasHistory);
  }, [attemptResumeThenPlayOrSheet, canSilentResume, openSources, savedState?.hasHistory]);

  const onSelectEpisode = useCallback((season: number, episode: number) => {
    setPickerSeason(season);
    setPickerEpisode(episode);
    setAutoPlayPreferred(true);
    setSheetOpen(true);
  }, []);

  const libraryId = lampaObjectId || routeId;

  const onStatusChange = useCallback((status: UserListStatus) => {
    if (!isAuthenticated || !libraryId) return;
    void updateLibraryLampaStatus(libraryId, status).then(invalidateLibrary);
  }, [invalidateLibrary, isAuthenticated, libraryId]);

  const onToggleFavorite = useCallback(() => {
    if (!isAuthenticated || !libraryId) return;
    void toggleLampaFavorite(
      libraryId,
      savedState?.isFavorite ?? false,
      savedState?.status,
    ).then(invalidateLibrary);
  }, [invalidateLibrary, isAuthenticated, libraryId, savedState?.isFavorite, savedState?.status]);

  const onOpenSourcesBrowse = useCallback(() => {
    openSources(false);
  }, [openSources]);

  const onCloseSheet = useCallback(() => {
    setSheetOpen(false);
  }, []);

  useEffect(() => {
    if (!isSerial || !routeId) return;
    let cancelled = false;
    void (async () => {
      const selection =
        (await loadLampaLastSelection(routeId)) ??
        (lampaObjectId ? await loadLampaLastSelection(lampaObjectId) : null);
      if (!cancelled) setVoiceLabel(formatLampaVoicePillLabel(selection));
    })();
    return () => {
      cancelled = true;
    };
  }, [isSerial, lampaObjectId, routeId, sheetOpen]);

  const seasons = detail ? parseLampaSeasons(detail.seasons) : [];

  const openLampaItem = useCallback((itemId: string | number, itemKind: 'movie' | 'tv' = kind) => {
    const path = lampaDetailPath(itemKind, { id: itemId });
    if (!path.includes('/undefined') && !path.endsWith('/')) {
      router.push(path as '/movies/[id]');
    }
  }, [kind, router]);

  const toRailItems = useCallback((items: LampaItem[]) => {
    return items.map((item) => ({
      ...mapLampaToRailItem(item),
      subtitle: lampaCardSubtitle(item),
    }));
  }, []);

  const franchiseRail = useMemo(() => toRailItems(franchise), [franchise, toRailItems]);
  const recommendationsRail = useMemo(
    () => toRailItems(recommendations),
    [recommendations, toRailItems],
  );
  const similarRail = useMemo(() => toRailItems(similarItems), [similarItems, toRailItems]);

  const onPressFranchise = useCallback(
    (item: RailItem) => {
      const source = franchise.find((row) => String(row.id) === String(item.id));
      const itemKind = source?.kind === 'tv' ? 'tv' : source?.kind === 'movie' ? 'movie' : kind;
      openLampaItem(item.id, itemKind);
    },
    [franchise, kind, openLampaItem],
  );
  const onPressRecommendations = useCallback(
    (item: RailItem) => {
      const source = recommendations.find((row) => String(row.id) === String(item.id));
      const itemKind = source?.kind === 'tv' ? 'tv' : source?.kind === 'movie' ? 'movie' : kind;
      openLampaItem(item.id, itemKind);
    },
    [kind, openLampaItem, recommendations],
  );
  const onPressSimilar = useCallback(
    (item: RailItem) => {
      const source = similarItems.find((row) => String(row.id) === String(item.id));
      const itemKind = source?.kind === 'tv' ? 'tv' : source?.kind === 'movie' ? 'movie' : kind;
      openLampaItem(item.id, itemKind);
    },
    [kind, openLampaItem, similarItems],
  );

  const collectionItem = useMemo(
    () =>
      detail
        ? {
            mediaType: 'lampa' as const,
            mediaId: `${kind}:${routeId}`,
            title: lampaTitle(detail),
            poster: lampaPosterPath(detail),
          }
        : null,
    [detail, kind, routeId],
  );

  const openFullList = useCallback(
    (section: 'cast' | 'related' | 'recommendations' | 'similar', title: string) => {
      if (tmdbId == null) return;
      router.push({
        pathname: '/detail-list',
        params: {
          media: 'lampa',
          kind,
          id: String(tmdbId),
          section,
          title,
          ...(collectionId != null ? { collectionId: String(collectionId) } : {}),
        },
      });
    },
    [collectionId, kind, router, tmdbId],
  );

  const relatedRails = (
    <>
      {franchiseFetching || franchise.length > 0 ? (
        <DetailPreviewRail
          title="Связанные"
          items={franchiseRail}
          loading={belowFoldReady && franchiseFetching && franchiseRail.length === 0}
          onItemPress={onPressFranchise}
          onSeeAll={() => openFullList('related', 'Связанные')}
          focusPriority={DETAIL_FOCUS_RELATED}
        />
      ) : null}
      <DetailPreviewRail
        title="Рекомендации"
        items={recommendationsRail}
        loading={belowFoldReady && recommendationsFetching && recommendationsRail.length === 0}
        onItemPress={onPressRecommendations}
        onSeeAll={() => openFullList('recommendations', 'Рекомендации')}
        focusPriority={DETAIL_FOCUS_RECOMMENDATIONS}
      />
      <DetailPreviewRail
        title="Похожее"
        items={similarRail}
        loading={belowFoldReady && similarFetching && similarRail.length === 0}
        onItemPress={onPressSimilar}
        onSeeAll={() => openFullList('similar', 'Похожее')}
        focusPriority={DETAIL_FOCUS_SIMILAR}
      />
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
            collectionItem={collectionItem}
            onWatch={onWatch}
            onOpenSources={onOpenSourcesBrowse}
            voiceLabel={voiceLabel}
            onStatusChange={onStatusChange}
            onToggleFavorite={onToggleFavorite}
            externalRatings={externalRatings}
          />

          {isSerial && seasons.length > 0 ? (
            <LampaDetailSeasons
              seasons={seasons}
              tmdbId={tmdbId}
              initialSeason={savedState?.hasHistory ? savedState.lastSeason : undefined}
              episodeProgressByKey={savedState?.episodeProgressByKey}
              onSelectEpisode={onSelectEpisode}
            />
          ) : null}

          <View style={styles.stack}>
            <LampaDetailCast
              cast={cast}
              loading={belowFoldReady && castFetching && cast.length === 0}
              onSeeAll={() => openFullList('cast', 'Актёры')}
            />
          </View>
          <View style={styles.stack}>{relatedRails}</View>
        </ScrollView>
      </>
    );
  }

  return (
    <DetailFocusScope focusPath={detailFocusPath(kind, routeId)}>
    <View style={styles.root} collapsable={false}>
      {main}
      {sheetOpen && detail && !resuming ? (
        <LampaSourceSheet
          visible={sheetOpen}
          onClose={onCloseSheet}
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
    </DetailFocusScope>
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
