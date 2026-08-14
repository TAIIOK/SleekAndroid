import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { fetchCollections } from '@/api/collections';
import {
  fetchAnimeCategories,
  fetchCatalog,
  fetchHistory,
  fetchLampaCategories,
  fetchLampaSections,
} from '@/api/catalog';
import { fetchFavoriteBookmarks, fetchSavedAnimeLibrary, fetchSavedLampaLibrary } from '@/api/library';
import { getPartyRoom } from '@/api/party';
import { AnimeCatalogRails } from '@/components/catalog/AnimeCatalogRails';
import { LampaKindRails } from '@/components/catalog/LampaKindRails';
import { ContinueWatchingRow } from '@/components/home/ContinueWatchingRow';
import { HomeSettingsSheet } from '@/components/home/HomeSettingsSheet';
import { HomeWelcomeModal } from '@/components/home/HomeWelcomeModal';
import { QuickActionsSection } from '@/components/home/QuickActionsSection';
import { TvHomeFeedGrid } from '@/components/home/TvHomeFeedGrid';
import { TvHomeFeedRails } from '@/components/home/TvHomeFeedRails';
import { TvHomeFeedTabs } from '@/components/home/TvHomeFeedTabs';
import { TvHomeTypeFilters } from '@/components/home/TvHomeTypeFilters';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, spacing } from '@/constants/aniverse';
import { useContinueWatching } from '@/hooks/useContinueWatching';
import { useHomeCatalogConfig } from '@/hooks/useHomeCatalogConfig';
import { useRefreshProgressOnResume } from '@/hooks/useRefreshProgressOnResume';
import { useTvCatalogScrollRestore } from '@/hooks/useTvCatalogScrollRestore';
import {
  clearActivePartyRoomId,
  getActivePartyRoomId,
} from '@/lib/activePartyRoom';
import { buildContinueWatchingDedupeKeys } from '@/lib/continueWatchingDedupe';
import { refreshHomeQueries } from '@/lib/homeRefresh';
import { prefetchCatalogHubQueries } from '@/lib/catalogHubPrefetch';
import { setHomeSettingsOpener } from '@/lib/homeSettingsBridge';
import { isHomeConfigConfigured, resolveEnabledContentTypes } from '@/lib/homeSettings';
import { tvVerticalCatalogScrollProps } from '@/lib/tvCatalogScroll';
import { useAuth } from '@/providers/AuthProvider';
import { HomeScrollLazyProvider, notifyHomeScrollLazy } from '@/providers/HomeScrollLazy';
import { isTvUi } from '@/lib/isTvUi';
import { useMobileChromeScroll, useMobileChromeScrollProps } from '@/providers/MobileChromeScroll';
import {
  resolveAvailableTvHomeFeedTabs,
  resolveAvailableTvHomeTypeFilters,
  resolveTvHomeSources,
  type TvHomeFeedTab,
  type TvHomeTypeFilter,
} from '@/lib/tvHomeFeeds';

export default function HomeScreen() {
  const isTv = isTvUi();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  /** Remount RefreshControl after each pull — Android leaves an invisible hit target otherwise. */
  const [refreshControlKey, setRefreshControlKey] = useState(0);
  const [feedTab, setFeedTab] = useState<TvHomeFeedTab>('all');
  const [typeFilter, setTypeFilter] = useState<TvHomeTypeFilter>('all');
  const [activePartyRoomId, setActivePartyRoomId] = useState<string | null>(null);
  const { config, persist, ready, syncSettled } = useHomeCatalogConfig();
  const showWelcome =
    ready && syncSettled && !isHomeConfigConfigured(config);
  const catalogScroll = useTvCatalogScrollRestore('/', { enabled: ready });
  const chrome = useMobileChromeScroll();
  const homeScrollYRef = useRef(0);
  const homeContentRef = useRef<View>(null);
  const isGuest = !user?.email || user.nickname === 'Гость';

  const onHomeScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      homeScrollYRef.current = event.nativeEvent.contentOffset.y;
      catalogScroll.onScroll?.(event);
      if (!isTv) notifyHomeScrollLazy(event.nativeEvent.contentOffset.y);
    },
    [catalogScroll, isTv],
  );

  const chromeScrollProps = useMobileChromeScrollProps(onHomeScroll, [
    styles.content,
    isTvUi() && styles.contentTv,
  ]);
  const refreshInset =
    !isTv && chrome?.contentInsetsEnabled ? chrome.topContentInset : 0;
  const { items: continueItems, ready: continueReady } = useContinueWatching();
  useRefreshProgressOnResume();
  const continueWatchingDedupe = useMemo(
    () => buildContinueWatchingDedupeKeys(continueItems),
    [continueItems],
  );

  useEffect(() => {
    if (!ready || !syncSettled) return;
    const timer = setTimeout(() => {
      void prefetchCatalogHubQueries(queryClient, config);
    }, 400);
    return () => clearTimeout(timer);
  }, [ready, syncSettled, queryClient, config]);

  const onRefresh = useCallback(async () => {
    if (refreshing || homeScrollYRef.current > 12) return;
    setRefreshing(true);
    try {
      await refreshHomeQueries(queryClient);
    } finally {
      setRefreshing(false);
      // Drop the Android SwipeRefreshLayout ghost overlay that blocks poster taps.
      setRefreshControlKey((key) => key + 1);
      if (!isTv) {
        requestAnimationFrame(() => {
          notifyHomeScrollLazy(homeScrollYRef.current);
        });
      }
    }
  }, [isTv, queryClient, refreshing]);

  useEffect(() => {
    setHomeSettingsOpener(() => setSettingsOpen(true));
    return () => setHomeSettingsOpener(null);
  }, []);

  const { data: contentTypes = [], isLoading: contentTypesLoading } = useQuery({
    queryKey: ['catalog-root'],
    queryFn: fetchCatalog,
  });

  const { data: lampaCategories } = useQuery({
    queryKey: ['lampa-categories'],
    queryFn: fetchLampaCategories,
  });

  const { data: animeCategories, isLoading: animeCategoriesLoading } = useQuery({
    queryKey: ['anime-categories'],
    queryFn: fetchAnimeCategories,
    enabled: isTv,
  });

  const { data: lampaMovieSections = [], isLoading: movieSectionsLoading } = useQuery({
    queryKey: ['lampa-sections', 'movie'],
    queryFn: () => fetchLampaSections('movie'),
    enabled: isTv,
  });

  const { data: lampaTvSections = [], isLoading: tvSectionsLoading } = useQuery({
    queryKey: ['lampa-sections', 'tv'],
    queryFn: () => fetchLampaSections('tv'),
    enabled: isTv,
  });

  // Quick Actions is phone-only; skip these fetches on TV release builds.
  const { data: savedAnime = [] } = useQuery({
    queryKey: ['library-anime', 'include-anime'],
    queryFn: fetchSavedAnimeLibrary,
    enabled: !isTv,
  });

  const { data: savedLampa = [] } = useQuery({
    queryKey: ['library-lampa', 'include-lampa'],
    queryFn: fetchSavedLampaLibrary,
    enabled: !isTv,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['history'],
    queryFn: fetchHistory,
    enabled: !isTv,
  });

  const { data: bookmarks = [] } = useQuery({
    queryKey: ['library-favorites'],
    queryFn: fetchFavoriteBookmarks,
    enabled: !isTv,
    retry: false,
  });

  const { data: collections = [] } = useQuery({
    queryKey: ['collections'],
    queryFn: fetchCollections,
    enabled: !isTv,
    retry: false,
  });

  useFocusEffect(
    useCallback(() => {
      if (isTv || isGuest) {
        setActivePartyRoomId(null);
        return;
      }
      void getActivePartyRoomId().then(setActivePartyRoomId);
    }, [isGuest, isTv]),
  );

  const activePartyQuery = useQuery({
    queryKey: ['party-room', activePartyRoomId],
    queryFn: () => getPartyRoom(activePartyRoomId!),
    enabled: !isTv && !isGuest && !!activePartyRoomId,
    staleTime: 15_000,
    retry: false,
  });

  useEffect(() => {
    if (!activePartyRoomId || !activePartyQuery.isError) return;
    void clearActivePartyRoomId().then(() => setActivePartyRoomId(null));
  }, [activePartyRoomId, activePartyQuery.isError]);

  const activeParty = useMemo(() => {
    const room = activePartyQuery.data;
    if (!room || room.id !== activePartyRoomId) return undefined;
    return {
      id: room.id,
      title: room.content?.title || room.title || 'Вернуться',
    };
  }, [activePartyQuery.data, activePartyRoomId]);

  const enabledTypes = resolveEnabledContentTypes(
    config,
    contentTypes.map((type) => type.id),
  );

  const lampaKinds = (lampaCategories?.kinds ?? []).filter(
    (kind) => kind.id === 'movie' || kind.id === 'tv',
  );
  const firstLampaKindId = lampaKinds[0]?.id;

  const availableTypeFilters = useMemo(() => {
    if (!isTv) return [];
    return resolveAvailableTvHomeTypeFilters(enabledTypes, config);
  }, [config, enabledTypes, isTv]);

  const activeTypeFilter = useMemo(() => {
    if (availableTypeFilters.some((option) => option.id === typeFilter)) return typeFilter;
    return availableTypeFilters[0]?.id ?? 'all';
  }, [availableTypeFilters, typeFilter]);

  useEffect(() => {
    if (!isTv) return;
    if (typeFilter !== activeTypeFilter) {
      setTypeFilter(activeTypeFilter);
    }
  }, [activeTypeFilter, isTv, typeFilter]);

  const tvFeedOptions = useMemo(
    () => ({
      filter: activeTypeFilter,
      config,
      animeShowcases: animeCategories?.showcases ?? [],
      lampaMovieSections,
      lampaTvSections,
      enabledTypes,
      firstLampaKindId,
    }),
    [
      activeTypeFilter,
      config,
      animeCategories?.showcases,
      lampaMovieSections,
      lampaTvSections,
      enabledTypes,
      firstLampaKindId,
    ],
  );

  const availableFeedTabs = useMemo(() => {
    if (!isTv) return [];
    return resolveAvailableTvHomeFeedTabs(tvFeedOptions);
  }, [isTv, tvFeedOptions]);

  const activeFeedTab = useMemo(() => {
    if (availableFeedTabs.some((tab) => tab.id === feedTab)) return feedTab;
    return availableFeedTabs[0]?.id ?? 'all';
  }, [availableFeedTabs, feedTab]);

  useEffect(() => {
    if (!isTv) return;
    if (feedTab !== activeFeedTab) {
      setFeedTab(activeFeedTab);
    }
  }, [activeFeedTab, feedTab, isTv]);

  const tvSources = useMemo(() => {
    if (!isTv) return [];
    return resolveTvHomeSources({
      ...tvFeedOptions,
      tab: activeFeedTab,
    });
  }, [activeFeedTab, isTv, tvFeedOptions]);

  const tvCatalogLoading =
    isTv &&
    (!syncSettled ||
      contentTypesLoading ||
      animeCategoriesLoading ||
      movieSectionsLoading ||
      tvSectionsLoading);

  if (!ready) {
    return (
      <ScrollView
        ref={catalogScroll.scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
      />
    );
  }

  // Phone Quick Actions is the content entry only after Continue Watching is confirmed empty.
  const continueEmpty = continueReady && continueItems.length === 0;

  return (
    <>
      <HomeScrollLazyProvider contentRef={homeContentRef}>
        <ScrollView
          ref={catalogScroll.scrollRef}
          style={styles.scroll}
          refreshControl={
            !isTv ? (
              <RefreshControl
                key={refreshControlKey}
                refreshing={refreshing}
                onRefresh={() => void onRefresh()}
                progressViewOffset={refreshInset}
                tintColor={colors.brand}
                colors={[colors.brand]}
              />
            ) : undefined
          }
          {...chromeScrollProps}
          {...tvVerticalCatalogScrollProps}
        >
          <View ref={homeContentRef} collapsable={false} style={styles.homeBody}>
        {isTv ? (
          <>
            <TvHomeTypeFilters
              value={activeTypeFilter}
              onChange={setTypeFilter}
              options={availableTypeFilters}
              contentEntry
              onOpenSettings={() => setSettingsOpen(true)}
            />
            <TvHomeFeedTabs
              value={activeFeedTab}
              onChange={setFeedTab}
              tabs={availableFeedTabs}
            />

            <ContinueWatchingRow items={continueItems} />

            {tvCatalogLoading ? (
              <ActivityIndicator color={colors.brand} style={styles.loader} />
            ) : tvSources.length === 0 ? (
              <Text style={styles.empty}>
                Нет лент для выбранных фильтров. Откройте «Настройки лент», чтобы выбрать витрины.
              </Text>
            ) : tvSources.length === 1 ? (
              <TvHomeFeedGrid
                key={tvSources[0].key}
                source={tvSources[0]}
                config={config}
                contentEntry={false}
              />
            ) : (
              <TvHomeFeedRails
                key={`${activeFeedTab}-${activeTypeFilter}`}
                sources={tvSources}
                config={config}
                restorePath="/"
              />
            )}
          </>
        ) : (
          <>
            <ContinueWatchingRow items={continueItems} />
            <QuickActionsSection
              contentEntry={continueEmpty}
              activeParty={activeParty}
              counts={{
                bookmarks: bookmarks.length,
                lists: savedAnime.length + savedLampa.length,
                collections: collections.length,
                history: history.length,
              }}
            />

            {enabledTypes.includes('anime') ? (
              <View style={styles.group}>
                <SectionHeader title="Аниме" variant="group" />
                <AnimeCatalogRails
                  config={config}
                  forHome
                  continueWatchingDedupe={continueWatchingDedupe}
                />
              </View>
            ) : null}

            {enabledTypes.includes('lampa') &&
              lampaKinds.map((kind) => (
                <View key={kind.id} style={styles.group}>
                  <SectionHeader title={kind.name} variant="group" />
                  <LampaKindRails
                    kind={kind.id as 'movie' | 'tv'}
                    config={config}
                    home
                    firstKindId={firstLampaKindId}
                    continueWatchingDedupe={continueWatchingDedupe}
                  />
                </View>
              ))}
          </>
        )}
          </View>
      </ScrollView>
      </HomeScrollLazyProvider>

      <HomeWelcomeModal
        open={showWelcome}
        config={config}
        onSave={(next) => {
          void persist(next);
        }}
        onSkip={(next) => {
          void persist(next);
        }}
      />

      <HomeSettingsSheet
        open={settingsOpen}
        config={config}
        onClose={() => setSettingsOpen(false)}
        onSave={(next) => {
          void persist(next);
          setSettingsOpen(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingTop: isTvUi() ? spacing.md : spacing.md,
    paddingBottom: spacing.xl,
  },
  contentTv: {
    // Keep room for the first row focus ring under the shell edge.
    paddingTop: spacing.md,
  },
  // Above Android RefreshControl's leftover hit target after pull-to-refresh.
  homeBody: {
    zIndex: 1,
    elevation: 1,
  },
  group: {
    marginBottom: isTvUi() ? spacing.md : 0,
  },
  loader: {
    marginTop: spacing.xxl,
  },
  empty: {
    color: colors.textSecondary,
    fontSize: 16,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
});
