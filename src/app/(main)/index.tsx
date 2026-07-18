import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';

import { fetchCollections } from '@/api/collections';
import { fetchCatalog, fetchHistory, fetchLampaCategories } from '@/api/catalog';
import { fetchFavoriteBookmarks, fetchSavedAnimeLibrary, fetchSavedLampaLibrary } from '@/api/library';
import { AnimeCatalogRails } from '@/components/catalog/AnimeCatalogRails';
import { LampaKindRails } from '@/components/catalog/LampaKindRails';
import { ContinueWatchingRow } from '@/components/home/ContinueWatchingRow';
import { HomeSettingsSheet } from '@/components/home/HomeSettingsSheet';
import { QuickActionsSection } from '@/components/home/QuickActionsSection';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, spacing } from '@/constants/aniverse';
import { useContinueWatching } from '@/hooks/useContinueWatching';
import { useHomeCatalogConfig } from '@/hooks/useHomeCatalogConfig';
import { buildContinueWatchingDedupeKeys } from '@/lib/continueWatchingDedupe';
import { setHomeSettingsOpener } from '@/lib/homeSettingsBridge';
import { resolveEnabledContentTypes } from '@/lib/homeSettings';
import { tvVerticalCatalogScrollProps } from '@/lib/tvCatalogScroll';

export default function HomeScreen() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { config, persist, ready } = useHomeCatalogConfig();
  const { items: continueItems } = useContinueWatching();
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

  const { data: savedAnime = [] } = useQuery({
    queryKey: ['library-anime', 'include-anime'],
    queryFn: fetchSavedAnimeLibrary,
  });

  const { data: savedLampa = [] } = useQuery({
    queryKey: ['library-lampa', 'include-lampa'],
    queryFn: fetchSavedLampaLibrary,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['history'],
    queryFn: fetchHistory,
  });

  const { data: bookmarks = [] } = useQuery({
    queryKey: ['library-favorites'],
    queryFn: fetchFavoriteBookmarks,
    retry: false,
  });

  const { data: collections = [] } = useQuery({
    queryKey: ['collections'],
    queryFn: fetchCollections,
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

  if (!ready) {
    return <ScrollView style={styles.scroll} contentContainerStyle={styles.content} />;
  }

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, Platform.isTV && styles.contentTv]}
        {...tvVerticalCatalogScrollProps}
      >
        <ContinueWatchingRow items={continueItems} />

        <QuickActionsSection
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
      </ScrollView>

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
    paddingTop: Platform.isTV ? spacing.lg : spacing.md,
    paddingBottom: spacing.xl,
  },
  contentTv: {
    // Keep room for the first row focus ring under the shell edge.
    paddingTop: spacing.lg,
  },
  group: {
    marginBottom: Platform.isTV ? spacing.md : 0,
  },
});
