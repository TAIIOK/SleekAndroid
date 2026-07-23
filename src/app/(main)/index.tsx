import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
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
import { useTvCatalogScrollRestore } from '@/hooks/useTvCatalogScrollRestore';
import { buildContinueWatchingDedupeKeys } from '@/lib/continueWatchingDedupe';
import { setHomeSettingsOpener } from '@/lib/homeSettingsBridge';
import { isHomeConfigConfigured, resolveEnabledContentTypes } from '@/lib/homeSettings';
import { tvVerticalCatalogScrollProps } from '@/lib/tvCatalogScroll';
import { isTvUi } from '@/lib/isTvUi';
import { useMobileChromeScrollProps } from '@/providers/MobileChromeScroll';
import {
  resolveAvailableTvHomeFeedTabs,
  resolveAvailableTvHomeTypeFilters,
  resolveTvHomeSources,
  type TvHomeFeedTab,
  type TvHomeTypeFilter,
} from '@/lib/tvHomeFeeds';

const isTv = isTvUi();

export default function HomeScreen() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [feedTab, setFeedTab] = useState<TvHomeFeedTab>('all');
  const [typeFilter, setTypeFilter] = useState<TvHomeTypeFilter>('all');
  const { config, persist, ready, syncSettled } = useHomeCatalogConfig();
  const showWelcome =
    ready && syncSettled && !isHomeConfigConfigured(config);
  const catalogScroll = useTvCatalogScrollRestore('/');
  const chromeScrollProps = useMobileChromeScrollProps(catalogScroll.onScroll, [
    styles.content,
    isTvUi() && styles.contentTv,
  ]);
  const { items: continueItems, ready: continueReady } = useContinueWatching();
  const continueWatchingDedupe = useMemo(
    () => buildContinueWatchingDedupeKeys(continueItems),
    [continueItems],
  );

  useEffect(() => {
    setHomeSettingsOpener(() => setSettingsOpen(true));
    return () => setHomeSettingsOpener(null);
  }, []);

  const { data: contentTypes = [] } = useQuery({
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
    return resolveAvailableTvHomeTypeFilters(enabledTypes);
  }, [enabledTypes]);

  const activeTypeFilter = useMemo(() => {
    if (availableTypeFilters.some((option) => option.id === typeFilter)) return typeFilter;
    return availableTypeFilters[0]?.id ?? 'all';
  }, [availableTypeFilters, typeFilter]);

  useEffect(() => {
    if (!isTv) return;
    if (typeFilter !== activeTypeFilter) {
      setTypeFilter(activeTypeFilter);
    }
  }, [activeTypeFilter, typeFilter]);

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
  }, [tvFeedOptions]);

  const selectedFeedCount = Math.max(0, availableFeedTabs.length - 1);

  const activeFeedTab = useMemo(() => {
    if (availableFeedTabs.some((tab) => tab.id === feedTab)) return feedTab;
    return availableFeedTabs[0]?.id ?? 'all';
  }, [availableFeedTabs, feedTab]);

  useEffect(() => {
    if (!isTv) return;
    if (feedTab !== activeFeedTab) {
      setFeedTab(activeFeedTab);
    }
  }, [activeFeedTab, feedTab]);

  const tvSources = useMemo(() => {
    if (!isTv) return [];
    return resolveTvHomeSources({
      ...tvFeedOptions,
      tab: activeFeedTab,
    });
  }, [tvFeedOptions, activeFeedTab]);

  const tvCatalogLoading =
    isTv && (animeCategoriesLoading || movieSectionsLoading || tvSectionsLoading);

  if (!ready) {
    return <ScrollView style={styles.scroll} contentContainerStyle={styles.content} />;
  }

  // Wait until continue settles — otherwise filters steal preferred focus first.
  const continueEmpty = continueReady && continueItems.length === 0;

  return (
    <>
      <ScrollView
        ref={catalogScroll.scrollRef}
        style={styles.scroll}
        {...chromeScrollProps}
        {...tvVerticalCatalogScrollProps}
      >
        <ContinueWatchingRow items={continueItems} />

        {isTv ? (
          <>
            <TvHomeTypeFilters
              value={activeTypeFilter}
              onChange={setTypeFilter}
              options={availableTypeFilters}
              contentEntry={continueEmpty}
              onOpenSettings={() => setSettingsOpen(true)}
              selectedFeedCount={selectedFeedCount}
            />
            <TvHomeFeedTabs
              value={activeFeedTab}
              onChange={setFeedTab}
              tabs={availableFeedTabs}
            />

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
            <QuickActionsSection
              contentEntry={continueEmpty}
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
      </ScrollView>

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
