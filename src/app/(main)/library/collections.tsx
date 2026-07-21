import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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
import { PosterGrid } from '@/components/catalog/PosterGrid';
import { TvFocusable } from '@/components/tv/TvFocusable';
import {
  collectionItemPath,
  collectionItemPoster,
  formatCollectionItemCount,
} from '@/lib/collectionItems';
import { colors, layout, radii, spacing } from '@/constants/aniverse';
import { tvVerticalCatalogScrollProps } from '@/lib/tvCatalogScroll';
import { isTvUi } from '@/lib/isTvUi';

export default function CollectionsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

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
      contentContainerStyle={styles.content}
      {...tvVerticalCatalogScrollProps}
    >
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
            const preview = previewQueries[index]?.data?.items?.slice(0, 3) ?? [];
            return (
              <TvFocusable
                key={col.id}
                style={[styles.card, selectedId === col.id && styles.cardSelected]}
                onPress={() => setSelectedId(col.id)}
                railStart={index === 0}
              >
                <Text style={styles.cardTitle}>{col.name}</Text>
                {col.description ? (
                  <Text style={styles.cardDesc} numberOfLines={2}>
                    {col.description}
                  </Text>
                ) : null}
                <Text style={styles.cardMeta}>
                  {formatCollectionItemCount(col.itemCount ?? preview.length)}
                </Text>
              </TvFocusable>
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
            <PosterGrid>
              {detail.items.map((item, index) => (
                <View key={item.id} style={styles.gridItem}>
                  <CatalogPosterCard
                    variant="grid"
                    width={layout.posterWidthRail}
                    title={item.title ?? item.mediaId}
                    poster={collectionItemPoster(item.mediaType, item.poster)}
                    subtitle={item.mediaType}
                    onPress={() => router.push(collectionItemPath(item) as '/')}
                    railStart={index === 0}
                  />
                  <TvFocusable
                    style={styles.removeItemBtn}
                    onPress={() =>
                      removeItemMut.mutate({ collectionId: selectedId, itemId: item.id })
                    }
                  >
                    <Text style={styles.removeItemLabel}>×</Text>
                  </TvFocusable>
                </View>
              ))}
            </PosterGrid>
          )}
        </View>
      ) : null}
    </ScrollView>
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
  cards: { gap: spacing.md },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardSelected: {
    borderColor: colors.brand,
    backgroundColor: 'rgba(195,192,255,0.08)',
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  cardDesc: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  cardMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
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
