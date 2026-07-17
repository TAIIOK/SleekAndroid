import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fetchSavedAnimeLibrary } from '@/api/library';
import { fetchActivityHistory, hideActivityFeed } from '@/api/user';
import { CatalogPosterCard } from '@/components/catalog/CatalogPosterCard';
import { HistoryClearConfirm } from '@/components/history/HistoryClearConfirm';
import { HistoryMediaFilters } from '@/components/history/HistoryMediaFilters';
import { colors, layout, spacing } from '@/constants/aniverse';
import {
  buildWatchHistoryItems,
  enrichHistoryPosters,
  filterHistoryByMedia,
  getHiddenHistoryIds,
  groupHistoryByDate,
  hideHistoryIds,
  type HistoryMediaFilter,
} from '@/lib/history';
import { useAuth } from '@/providers/AuthProvider';

export default function HistoryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [media, setMedia] = useState<HistoryMediaFilter>('all');
  const [confirmClear, setConfirmClear] = useState(false);
  const [hiddenRevision, setHiddenRevision] = useState(0);

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['history-feed'],
    queryFn: fetchActivityHistory,
  });

  const { data: savedAnime = [] } = useQuery({
    queryKey: ['library-anime-history'],
    queryFn: fetchSavedAnimeLibrary,
    enabled: isAuthenticated,
  });

  const { data: hiddenIds = new Set<string>() } = useQuery({
    queryKey: ['history-hidden', hiddenRevision],
    queryFn: getHiddenHistoryIds,
  });

  const allItems = useMemo(() => {
    const built = enrichHistoryPosters(buildWatchHistoryItems(history), savedAnime);
    return built.filter((item) => !hiddenIds.has(item.id));
  }, [history, savedAnime, hiddenIds]);

  const filteredItems = useMemo(
    () => filterHistoryByMedia(allItems, media),
    [allItems, media],
  );

  const groups = useMemo(() => groupHistoryByDate(filteredItems), [filteredItems]);

  const clearMutation = useMutation({
    mutationFn: async (items: typeof filteredItems) => {
      const feedIds = items.map((item) => item.id).filter((id) => !id.startsWith('progress-'));
      await Promise.allSettled(feedIds.map((id) => hideActivityFeed(id)));
      await hideHistoryIds(items.map((item) => item.id));
    },
    onSuccess: () => {
      setHiddenRevision((value) => value + 1);
      void queryClient.invalidateQueries({ queryKey: ['history-feed'] });
      setConfirmClear(false);
    },
  });

  const horizontalPad = Platform.isTV ? layout.gutterDesktop : layout.gutterMobile;

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={[styles.header, { paddingHorizontal: horizontalPad }]}>
          <Text style={styles.title}>История просмотра</Text>
          {filteredItems.length > 0 ? (
            <Pressable onPress={() => setConfirmClear(true)}>
              <Text style={styles.clear}>Очистить</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: horizontalPad }}>
          <HistoryMediaFilters value={media} onChange={setMedia} />
        </View>

        {historyLoading ? (
          <Text style={[styles.hint, { paddingHorizontal: horizontalPad }]}>Загрузка…</Text>
        ) : groups.length === 0 ? (
          <Text style={[styles.hint, { paddingHorizontal: horizontalPad }]}>История пуста</Text>
        ) : (
          groups.map((group) => (
            <View key={group.key} style={styles.group}>
              <Text style={[styles.groupTitle, { paddingHorizontal: horizontalPad }]}>
                {group.label}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.rail, { paddingHorizontal: horizontalPad }]}
              >
                {group.items.map((item) => (
                  <CatalogPosterCard
                    key={item.id}
                    title={item.title}
                    poster={item.poster}
                    subtitle={
                      item.progressPercent != null
                        ? `${item.progressPercent}%`
                        : undefined
                    }
                    onPress={() => router.push(item.href as never)}
                    variant="rail"
                  />
                ))}
              </ScrollView>
            </View>
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
  content: { paddingVertical: spacing.xl, gap: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.text,
    fontSize: Platform.isTV ? 32 : 24,
    fontWeight: '700',
  },
  clear: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '600',
  },
  hint: { color: colors.textSecondary, fontSize: 16 },
  group: { gap: spacing.sm },
  groupTitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  rail: { gap: 0, paddingBottom: spacing.xs },
});
