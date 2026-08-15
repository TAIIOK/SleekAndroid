import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  createCollection,
  deleteCollection,
  fetchCollection,
  fetchCollections,
  removeCollectionItem,
} from '@/api/collections';
import { CatalogPosterCard } from '@/components/catalog/CatalogPosterCard';
import { PosterGrid, usePosterGridCardWidth } from '@/components/catalog/PosterGrid';
import { LibraryCollectionCard } from '@/components/library/LibraryCollectionCard';
import { LibraryShowMoreButton } from '@/components/library/LibraryShowMoreButton';
import { LibraryHubChrome } from '@/components/library/LibraryHubChrome';
import { TvFocusable } from '@/components/tv/TvFocusable';
import {
  collectionItemPath,
  collectionItemPoster,
  formatCollectionItemCount,
} from '@/lib/collectionItems';
import { colors, radii, spacing } from '@/constants/aniverse';
import { LIBRARY_PAGE_SIZE } from '@/lib/libraryPaging';
import { tvVerticalCatalogScrollProps } from '@/lib/tvCatalogScroll';
import { isTvUi } from '@/lib/isTvUi';
import { useMobileChromeScrollProps } from '@/providers/MobileChromeScroll';
import type { UserCollectionItem } from '@/types/collection';

export default function CollectionsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const cardWidth = usePosterGridCardWidth();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(LIBRARY_PAGE_SIZE);
  const chromeScrollProps = useMobileChromeScrollProps(undefined, styles.content);

  useEffect(() => {
    setVisibleCount(LIBRARY_PAGE_SIZE);
  }, [selectedId]);

  const { data: collections = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['collections'],
    queryFn: fetchCollections,
  });

  const previewQueries = useQueries({
    queries: collections.map((col) => ({
      queryKey: ['collection', col.id],
      queryFn: () => fetchCollection(col.id),
    })),
  });

  const {
    data: detail,
    isLoading: detailLoading,
    isError: detailError,
    refetch: refetchDetail,
  } = useQuery({
    queryKey: ['collection', selectedId],
    queryFn: () => fetchCollection(selectedId!),
    enabled: selectedId != null,
  });

  const createMut = useMutation({
    mutationFn: () => createCollection(newName.trim()),
    onMutate: () => setCreateError(null),
    onSuccess: async (col) => {
      setNewName('');
      await qc.invalidateQueries({ queryKey: ['collections'] });
      setSelectedId(col.id);
    },
    onError: (err) => {
      setCreateError(err instanceof Error ? err.message : 'Не удалось создать коллекцию');
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteCollection(id),
    onSuccess: async () => {
      setSelectedId(null);
      await qc.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  const removeItemMut = useMutation({
    mutationFn: ({ collectionId, itemId }: { collectionId: number; itemId: number }) =>
      removeCollectionItem(collectionId, itemId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['collection', selectedId] });
      await qc.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  const confirmDeleteCollection = (id: number) => {
    Alert.alert('Удалить коллекцию?', 'Это действие нельзя отменить', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => deleteMut.mutate(id),
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      {...chromeScrollProps}
      {...tvVerticalCatalogScrollProps}
    >
      <LibraryHubChrome />
      <View style={styles.createRow}>
        <TextInput
          style={styles.input}
          value={newName}
          onChangeText={setNewName}
          placeholder="Название новой коллекции"
          placeholderTextColor={colors.textSecondary}
        />
        <TvFocusable
          style={[styles.createBtn, (!newName.trim() || createMut.isPending) && styles.btnDisabled]}
          disabled={!newName.trim() || createMut.isPending}
          onPress={() => createMut.mutate()}
        >
          <Text style={styles.createBtnLabel}>Создать</Text>
        </TvFocusable>
      </View>

      {createError ? <Text style={styles.error}>{createError}</Text> : null}

      {isError ? (
        <View style={styles.errorBox}>
          <Text style={styles.error}>Не удалось загрузить коллекции</Text>
          <TvFocusable onPress={() => void refetch()} style={styles.linkBtn}>
            <Text style={styles.link}>Повторить</Text>
          </TvFocusable>
        </View>
      ) : !collections.length ? (
        <Text style={styles.muted}>
          Создайте коллекцию, чтобы группировать аниме, фильмы и мангу.
        </Text>
      ) : (
        <View style={styles.cards}>
          {collections.map((col, index) => {
            const previewQuery = previewQueries[index];
            return (
              <LibraryCollectionCard
                key={col.id}
                collection={col}
                previewItems={previewQuery?.data?.items?.slice(0, 4)}
                previewLoading={previewQuery?.isLoading && !previewQuery?.data}
                selected={selectedId === col.id}
                railStart={index === 0}
                onPress={() => setSelectedId(col.id === selectedId ? null : col.id)}
              />
            );
          })}
        </View>
      )}

      {selectedId != null ? (
        <View style={styles.detail}>
          <View style={styles.detailHeader}>
            <View style={styles.detailTitleBlock}>
              <Text style={styles.detailTitle}>{detail?.collection.name ?? 'Коллекция'}</Text>
              {!detailLoading && !detailError ? (
                <Text style={styles.muted}>
                  {formatCollectionItemCount(detail?.items.length ?? 0)}
                </Text>
              ) : null}
            </View>
            <TvFocusable
              style={styles.deleteBtn}
              disabled={deleteMut.isPending}
              onPress={() => confirmDeleteCollection(selectedId)}
            >
              <Text style={styles.deleteLabel}>
                {deleteMut.isPending ? 'Удаление…' : 'Удалить'}
              </Text>
            </TvFocusable>
          </View>

          {detailLoading ? (
            <ActivityIndicator color={colors.brand} />
          ) : detailError ? (
            <View style={styles.errorBox}>
              <Text style={styles.error}>Не удалось открыть коллекцию</Text>
              <TvFocusable onPress={() => void refetchDetail()} style={styles.linkBtn}>
                <Text style={styles.link}>Повторить</Text>
              </TvFocusable>
            </View>
          ) : !detail?.items.length ? (
            <Text style={styles.muted}>
              Пока пусто. Добавляйте тайтлы с карточки аниме или фильма.
            </Text>
          ) : (
            <CollectionItemsGrid
              items={detail.items}
              cardWidth={cardWidth}
              visibleCount={visibleCount}
              onShowMore={() => setVisibleCount((n) => n + LIBRARY_PAGE_SIZE)}
              onOpen={(item) => router.push(collectionItemPath(item) as '/')}
              onRemove={(itemId) =>
                removeItemMut.mutate({ collectionId: selectedId, itemId })
              }
            />
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

function CollectionItemsGrid({
  items,
  cardWidth,
  visibleCount,
  onShowMore,
  onOpen,
  onRemove,
}: {
  items: UserCollectionItem[];
  cardWidth: number;
  visibleCount: number;
  onShowMore: () => void;
  onOpen: (item: UserCollectionItem) => void;
  onRemove: (itemId: number) => void;
}) {
  const visible = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasMore = items.length > visibleCount;

  return (
    <>
      <PosterGrid>
        {visible.map((item, index) => (
          <View key={item.id} style={styles.gridItem}>
            <CatalogPosterCard
              variant="grid"
              width={cardWidth}
              title={item.title ?? item.mediaId}
              poster={collectionItemPoster(item.mediaType, item.poster)}
              subtitle={item.mediaType}
              onPress={() => onOpen(item)}
              railStart={index === 0}
            />
            <TvFocusable style={styles.removeItemBtn} onPress={() => onRemove(item.id)}>
              <Text style={styles.removeItemLabel}>×</Text>
            </TvFocusable>
          </View>
        ))}
      </PosterGrid>
      {hasMore ? (
        <LibraryShowMoreButton
          remaining={items.length - visibleCount}
          pageSize={LIBRARY_PAGE_SIZE}
          onPress={onShowMore}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingBottom: isTvUi() ? spacing.xxl * 2 : spacing.xxl,
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  loader: { paddingVertical: spacing.xxl, alignItems: 'center' },
  createRow: { flexDirection: 'row', gap: spacing.sm },
  input: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 15,
  },
  createBtn: {
    backgroundColor: colors.brand,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  createBtnLabel: {
    color: colors.brandOn,
    fontWeight: '700',
    fontSize: 14,
  },
  error: { color: colors.danger, fontSize: 14 },
  errorBox: { gap: spacing.sm },
  linkBtn: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  link: { color: colors.brand, fontWeight: '600', fontSize: 14 },
  muted: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  detail: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    padding: spacing.lg,
    gap: spacing.md,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.md,
  },
  detailTitleBlock: { flex: 1, gap: spacing.xs },
  detailTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  deleteBtn: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
  },
  deleteLabel: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  gridItem: {
    position: 'relative',
  },
  removeItemBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeItemLabel: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
  },
});
