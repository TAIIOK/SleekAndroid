import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fetchLampaDetail, mapLampaToRailItem } from '@/api/catalog';
import {
  fetchSavedLampaLibrary,
  toggleLampaFavorite,
  updateLibraryLampaStatus,
} from '@/api/library';
import {
  fetchLampaRecommendations,
  fetchLampaSimilar,
} from '@/api/lampaExtras';
import { fetchLampaProgress } from '@/api/progress';
import { PosterRail } from '@/components/catalog/PosterRail';
import { LampaDetailGenres } from '@/components/lampa/detail/LampaDetailGenres';
import { LampaDetailHero } from '@/components/lampa/detail/LampaDetailHero';
import { LampaDetailPlot } from '@/components/lampa/detail/LampaDetailPlot';
import { LampaDetailSeasons } from '@/components/lampa/detail/LampaDetailSeasons';
import { LampaDetailSidebar } from '@/components/lampa/detail/LampaDetailSidebar';
import { LampaDetailSkeleton } from '@/components/lampa/detail/LampaDetailSkeleton';
import { LampaSourceSheet } from '@/components/lampa/LampaSourceSheet';
import { colors, spacing } from '@/constants/aniverse';
import {
  lampaDetailPath,
  lampaTitle,
  parseLampaSeasons,
  resolveLampaTmdbId,
} from '@/lib/lampaDetail';
import type { UserListStatus } from '@/lib/libraryStatus';
import { lampaPosterPath } from '@/lib/poster';
import { buildLampaPlaybackState } from '@/lib/progressUtils';
import { useAuth } from '@/providers/AuthProvider';

export function LampaDetailView({ kind }: { kind: 'movie' | 'tv' }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const routeId = String(id ?? '');
  const { isAuthenticated } = useAuth();
  const isSerial = kind === 'tv';

  const [sheetOpen, setSheetOpen] = useState(false);
  const [pickerSeason, setPickerSeason] = useState<number | undefined>();
  const [pickerEpisode, setPickerEpisode] = useState<number | undefined>();
  const [autoPlayPreferred, setAutoPlayPreferred] = useState(false);

  const {
    data: detail,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['lampa', kind, routeId],
    queryFn: () => fetchLampaDetail(kind, routeId),
    enabled: !!routeId,
  });

  const { data: savedLampa = [] } = useQuery({
    queryKey: ['library-lampa'],
    queryFn: fetchSavedLampaLibrary,
    enabled: isAuthenticated,
  });

  const lampaObjectId = useMemo(() => {
    if (!detail) return '';
    const d = detail as unknown as Record<string, unknown>;
    return String(d.objectId ?? d.object_id ?? '').trim();
  }, [detail]);

  const { data: lampaProgress = [] } = useQuery({
    queryKey: ['lampa-progress', lampaObjectId || undefined],
    queryFn: () => fetchLampaProgress(lampaObjectId),
    enabled: !!lampaObjectId && isAuthenticated,
    staleTime: 30_000,
  });

  const savedState = useMemo(
    () => (detail ? buildLampaPlaybackState(savedLampa, detail, lampaProgress) : null),
    [savedLampa, detail, lampaProgress],
  );

  const tmdbId = useMemo(
    () => (detail ? resolveLampaTmdbId(detail, routeId) : undefined),
    [detail, routeId],
  );

  const { data: similar = [], isPending: similarPending } = useQuery({
    queryKey: ['lampa-similar', kind, tmdbId ?? 0],
    queryFn: () => fetchLampaSimilar(kind, tmdbId!),
    enabled: tmdbId != null,
  });

  const { data: recommendations = [], isPending: recommendationsPending } = useQuery({
    queryKey: ['lampa-recommendations', kind, tmdbId ?? 0],
    queryFn: () => fetchLampaRecommendations(kind, tmdbId!),
    enabled: tmdbId != null,
  });

  const invalidateLibrary = () => {
    void queryClient.invalidateQueries({ queryKey: ['library-lampa'] });
    void queryClient.invalidateQueries({ queryKey: ['library-favorites'] });
  };

  const openSources = (preferResume: boolean) => {
    if (preferResume && savedState?.hasHistory) {
      setPickerSeason(savedState.lastSeason || 1);
      setPickerEpisode(savedState.lastEpisode || 1);
      setAutoPlayPreferred(true);
    } else {
      setPickerSeason(undefined);
      setPickerEpisode(undefined);
      setAutoPlayPreferred(false);
    }
    setSheetOpen(true);
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

  if (isLoading) return <LampaDetailSkeleton />;

  if (isError || !detail) {
    return (
      <View style={styles.loader}>
        <Text style={styles.errorTitle}>Не удалось загрузить</Text>
        <Text style={styles.errorBody}>Проверьте подключение или попробуйте позже</Text>
      </View>
    );
  }

  const seasons = parseLampaSeasons(detail.seasons);

  const relatedRails = (
    <>
      {(similar.length > 0 || similarPending) && (
        <PosterRail
          title="Похожие"
          items={similar.map(mapLampaToRailItem)}
          loading={similarPending}
          onItemPress={(item) => {
            const path = lampaDetailPath(kind, { id: item.id });
            if (!path.includes('/undefined') && !path.endsWith('/')) {
              router.push(path as '/movies/[id]');
            }
          }}
        />
      )}
      {(recommendations.length > 0 || recommendationsPending) && (
        <PosterRail
          title="Рекомендации"
          items={recommendations.map(mapLampaToRailItem)}
          loading={recommendationsPending}
          onItemPress={(item) => {
            const path = lampaDetailPath(kind, { id: item.id });
            if (!path.includes('/undefined') && !path.endsWith('/')) {
              router.push(path as '/movies/[id]');
            }
          }}
        />
      )}
    </>
  );

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
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
          onWatch={() => openSources(!!savedState?.hasHistory)}
          onOpenSources={isSerial ? () => openSources(false) : undefined}
          onStatusChange={onStatusChange}
          onToggleFavorite={onToggleFavorite}
        />

        <View style={styles.stack}>
          <LampaDetailPlot detail={detail} />
          <LampaDetailGenres detail={detail} />
          <LampaDetailSidebar detail={detail} isSerial={isSerial} />
        </View>

        {isSerial && seasons.length > 0 ? (
          <View style={styles.stack}>
            <LampaDetailSeasons
              seasons={seasons}
              tmdbId={tmdbId}
              episodeProgressByKey={savedState?.episodeProgressByKey}
              onSelectEpisode={onSelectEpisode}
            />
          </View>
        ) : null}

        <View style={styles.stack}>{relatedRails}</View>
      </ScrollView>

      <LampaSourceSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        detail={detail}
        kind={kind}
        routeId={routeId}
        lampaObjectId={lampaObjectId || undefined}
        initialSeason={isSerial ? pickerSeason : undefined}
        initialEpisode={isSerial ? pickerEpisode : undefined}
        autoPlayPreferredEpisode={isSerial && autoPlayPreferred}
        episodeProgressByKey={savedState?.episodeProgressByKey}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: Platform.isTV ? spacing.xxl : spacing.lg,
    gap: spacing.xl,
    paddingBottom: spacing.xxl * 2,
  },
  stack: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'stretch',
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
