import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fetchSavedAnimeLibrary, fetchSavedLampaLibrary } from '@/api/library';
import { fetchAnimeProgress, fetchLampaProgress } from '@/api/progress';
import { fetchActivityHistory, hideActivityFeed } from '@/api/user';
import { HistoryClearConfirm } from '@/components/history/HistoryClearConfirm';
import { HistoryDateRail } from '@/components/history/HistoryDateRail';
import { HistoryMediaFilters } from '@/components/history/HistoryMediaFilters';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, layout, spacing } from '@/constants/aniverse';
import {
  buildWatchHistoryItems,
  enrichHistoryPosters,
  filterHistoryByMedia,
  getHiddenHistoryIds,
  groupHistoryByDate,
  hideHistoryIds,
  historyContentKey,
  type HistoryMediaFilter,
} from '@/lib/history';
import { tvVerticalCatalogScrollProps } from '@/lib/tvCatalogScroll';
import { useAuth } from '@/providers/AuthProvider';
import { useMobileChromeScrollProps } from '@/providers/MobileChromeScroll';
import { isTvUi } from '@/lib/isTvUi';

export default function HistoryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [media, setMedia] = useState<HistoryMediaFilter>('all');
  const [confirmClear, setConfirmClear] = useState(false);
  const [hiddenRevision, setHiddenRevision] = useState(0);
  const chromeScrollProps = useMobileChromeScrollProps(undefined, styles.content);

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['history-feed'],
    queryFn: fetchActivityHistory,
  });

  const { data: savedAnime = [], isLoading: savedAnimeLoading } = useQuery({
    queryKey: ['library-anime', 'include-anime'],
    queryFn: fetchSavedAnimeLibrary,
    enabled: isAuthenticated,
  });

  const { data: savedLampa = [], isLoading: savedLampaLoading } = useQuery({
    queryKey: ['library-lampa', 'include-lampa'],
    queryFn: fetchSavedLampaLibrary,
    enabled: isAuthenticated,
  });

  const { data: animeProgress = [], isLoading: animeProgressLoading } = useQuery({
    queryKey: ['anime-progress'],
    queryFn: () => fetchAnimeProgress(),
    enabled: isAuthenticated,
  });

  const { data: lampaProgress = [], isLoading: lampaProgressLoading } = useQuery({
    queryKey: ['lampa-progress'],
    queryFn: () => fetchLampaProgress(),
    enabled: isAuthenticated,
  });

  const { data: hiddenIds = new Set<string>() } = useQuery({
    queryKey: ['history-hidden', hiddenRevision],
    queryFn: getHiddenHistoryIds,
  });

  const allItems = useMemo(() => {
    const built = enrichHistoryPosters(
      buildWatchHistoryItems(history, savedAnime, savedLampa, animeProgress, lampaProgress),
      savedAnime,
      savedLampa,
    );
    return built.filter(
      (item) => !hiddenIds.has(historyContentKey(item)) && !hiddenIds.has(item.id),
    );
  }, [history, savedAnime, savedLampa, animeProgress, lampaProgress, hiddenIds]);

  const filteredItems = useMemo(
    () => filterHistoryByMedia(allItems, media),
    [allItems, media],
  );

  const groups = useMemo(() => groupHistoryByDate(filteredItems), [filteredItems]);

  const isLoading =
    historyLoading ||
    (isAuthenticated &&
      (savedAnimeLoading || savedLampaLoading || animeProgressLoading || lampaProgressLoading));

  const clearMutation = useMutation({
    mutationFn: async (items: typeof filteredItems) => {
      const feedIds = items.map((item) => item.id).filter((id) => !id.startsWith('progress-'));
      await Promise.allSettled(feedIds.map((id) => hideActivityFeed(id)));
      await hideHistoryIds([
        ...items.map((item) => historyContentKey(item)),
        ...items.map((item) => item.id),
      ]);
    },
    onSuccess: () => {
      setHiddenRevision((value) => value + 1);
      void queryClient.invalidateQueries({ queryKey: ['history-feed'] });
      setConfirmClear(false);
    },
  });

  const horizontalPad = isTvUi() ? layout.gutterDesktop : layout.gutterMobile;

  return (
    <>
      <ScrollView
        style={styles.scroll}
        {...chromeScrollProps}
        {...tvVerticalCatalogScrollProps}
      >
        <View style={[styles.header, { paddingHorizontal: horizontalPad }]}>
          <Text style={styles.title}>История просмотра</Text>
          {filteredItems.length > 0 ? (
            <TvFocusable onPress={() => setConfirmClear(true)} style={styles.clearBtn}>
              <Text style={styles.clear}>Очистить</Text>
            </TvFocusable>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: horizontalPad }}>
          <HistoryMediaFilters value={media} onChange={setMedia} />
        </View>

        {isLoading ? (
          <Text style={[styles.hint, { paddingHorizontal: horizontalPad }]}>Загрузка…</Text>
        ) : groups.length === 0 ? (
          <Text style={[styles.hint, { paddingHorizontal: horizontalPad }]}>История пуста</Text>
        ) : (
          groups.map((group, groupIndex) => (
            <HistoryDateRail
              key={group.key}
              title={group.label}
              items={group.items}
              contentEntryRail={groupIndex === 0}
              onItemPress={(item) => router.push(item.href as never)}
            />
          ))
        )}
      </ScrollView>

      <HistoryClearConfirm
        visible={confirmClear}
        loading={clearMutation.isPending}
        onConfirm={() => clearMutation.mutate(filteredItems)}
        onCancel={() => setConfirmClear(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: {
    paddingVertical: spacing.xl,
    gap: spacing.lg,
    // Room so the last rail can snap fully into view on TV.
    paddingBottom: isTvUi() ? spacing.xxl * 2 : spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.text,
    fontSize: isTvUi() ? 26 : 24,
    fontWeight: '700',
  },
  clearBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  clear: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '600',
  },
  hint: { color: colors.textSecondary, fontSize: 16 },
});
