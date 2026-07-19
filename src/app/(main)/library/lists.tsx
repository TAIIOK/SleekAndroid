import { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MyListsContent } from '@/components/library/MyListsContent';
import { MyListsFilters } from '@/components/library/MyListsFilters';
import { MyListsStats } from '@/components/library/MyListsStats';
import { colors, spacing } from '@/constants/aniverse';
import { useSavedLibrary } from '@/hooks/useSavedLibrary';
import {
  getLampaKind,
  hasListStatus,
  hasLampaListStatus,
  type MyListsMediaFilter,
  type MyListsStatusFilter,
} from '@/lib/myLists';
import { tvVerticalCatalogScrollProps } from '@/lib/tvCatalogScroll';

export default function MyListsScreen() {
  const [media, setMedia] = useState<MyListsMediaFilter>('all');
  const [status, setStatus] = useState<MyListsStatusFilter>('all');
  const { savedAnime, savedLampa, isLoading, isError } = useSavedLibrary();

  const stats = useMemo(
    () => ({
      anime: savedAnime.filter((item) => hasListStatus(item.status)).length,
      movie: savedLampa.filter((row) => {
        const entry = row as Record<string, unknown>;
        return getLampaKind(entry) === 'movie' && hasLampaListStatus(entry);
      }).length,
      tv: savedLampa.filter((row) => {
        const entry = row as Record<string, unknown>;
        return getLampaKind(entry) === 'tv' && hasLampaListStatus(entry);
      }).length,
    }),
    [savedAnime, savedLampa],
  );

  const libraryTotal = useMemo(
    () =>
      savedAnime.filter((item) => hasListStatus(item.status)).length +
      savedLampa.filter((row) => hasLampaListStatus(row as Record<string, unknown>)).length,
    [savedAnime, savedLampa],
  );

  const groupByStatus = status === 'all';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      {...tvVerticalCatalogScrollProps}
    >
      <MyListsStats
        anime={stats.anime}
        movie={stats.movie}
        tv={stats.tv}
        media={media}
        onMediaChange={setMedia}
      />

      <MyListsFilters status={status} onStatusChange={setStatus} />

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : isError ? (
        <Text style={styles.empty}>Не удалось загрузить списки. Попробуйте обновить страницу.</Text>
      ) : (
        <MyListsContent
          media={media}
          anime={savedAnime}
          lampa={savedLampa as Array<Record<string, unknown>>}
          statusFilter={status}
          groupByStatus={groupByStatus}
          libraryTotal={libraryTotal}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: Platform.isTV ? spacing.xxl * 2 : spacing.xl,
    gap: spacing.lg,
    flexGrow: 1,
  },
  loader: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  empty: {
    color: colors.textSecondary,
    fontSize: 15,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
});
