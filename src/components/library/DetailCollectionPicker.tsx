import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  addCollectionItem,
  createCollection,
  fetchCollections,
} from '@/api/collections';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';
import { useTvEventHandlerSafe } from '@/lib/tvEventHandler';
import type { CollectionItemInput } from '@/types/collection';
import { isTvUi } from '@/lib/isTvUi';

type FocusTarget = number | 'create' | 'close';

interface DetailCollectionPickerProps {
  item: CollectionItemInput;
  disabled?: boolean;
}

export function DetailCollectionPicker({ item, disabled }: DetailCollectionPickerProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [inCollection, setInCollection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const focusedRef = useRef<FocusTarget | null>(null);
  const pickingRef = useRef(false);

  const { data: collections = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['collections'],
    queryFn: fetchCollections,
    enabled: open,
  });

  const close = useCallback(() => {
    focusedRef.current = null;
    pickingRef.current = false;
    setOpen(false);
  }, []);

  const invalidate = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ['collections'] });
  }, [qc]);

  const markAdded = useCallback(async () => {
    setInCollection(true);
    setError(null);
    await invalidate();
    close();
  }, [close, invalidate]);

  const addMut = useMutation({
    mutationFn: (collectionId: number) => addCollectionItem(collectionId, item),
    onSuccess: async () => {
      await markAdded();
    },
    onError: (err) => {
      pickingRef.current = false;
      setError(err instanceof Error ? err.message : 'Не удалось добавить');
    },
  });

  const createAndAddMut = useMutation({
    mutationFn: async () => {
      const name = `Коллекция ${collections.length + 1}`;
      const created = await createCollection(name);
      await addCollectionItem(created.id, item);
      return created;
    },
    onSuccess: async () => {
      await markAdded();
    },
    onError: (err) => {
      pickingRef.current = false;
      setError(err instanceof Error ? err.message : 'Не удалось создать коллекцию');
    },
  });

  const pickCollection = useCallback(
    (collectionId: number) => {
      if (pickingRef.current || addMut.isPending || createAndAddMut.isPending) return;
      pickingRef.current = true;
      focusedRef.current = null;
      setError(null);
      addMut.mutate(collectionId);
    },
    [addMut, createAndAddMut.isPending],
  );

  const createAndAdd = useCallback(() => {
    if (pickingRef.current || addMut.isPending || createAndAddMut.isPending) return;
    pickingRef.current = true;
    focusedRef.current = null;
    setError(null);
    createAndAddMut.mutate();
  }, [addMut.isPending, createAndAddMut]);

  useEffect(() => {
    if (!open) {
      focusedRef.current = null;
      pickingRef.current = false;
    }
  }, [open]);

  // Reset label when navigating to another title.
  useEffect(() => {
    setInCollection(false);
    setError(null);
  }, [item.mediaType, item.mediaId]);

  useTvEventHandlerSafe((evt) => {
    if (!open || !isTvUi()) return;
    if (evt.eventKeyAction != null && evt.eventKeyAction !== 1) return;
    if (evt.eventType !== 'select' && evt.eventType !== 'playPause') return;

    const focused = focusedRef.current;
    if (focused === 'close') {
      close();
      return;
    }
    if (focused === 'create') {
      createAndAdd();
      return;
    }
    if (typeof focused === 'number') {
      pickCollection(focused);
    }
  });

  const busy = addMut.isPending || createAndAddMut.isPending;

  return (
    <>
      <TvFocusable
        disabled={disabled}
        onPress={() => {
          setError(null);
          setOpen(true);
        }}
        style={[
          isTvUi() ? styles.iconBtn : styles.chip,
          inCollection ? (isTvUi() ? styles.iconBtnDone : styles.chipDone) : null,
        ]}
      >
        {isTvUi() ? (
          <Text style={styles.iconLabel}>⊞</Text>
        ) : (
          <Text style={styles.chipLabel}>{inCollection ? 'В коллекции' : 'В коллекцию'}</Text>
        )}
      </TvFocusable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.backdrop} focusable={false}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={close}
            focusable={false}
            accessible={false}
          />
          <View style={styles.sheet} focusable={false}>
            <Text style={styles.sheetTitle}>Добавить в коллекцию</Text>
            {item.title ? (
              <Text style={styles.sheetSubtitle} numberOfLines={2}>
                {item.title}
              </Text>
            ) : null}

            {isLoading ? (
              <ActivityIndicator color={colors.brand} style={{ marginVertical: spacing.lg }} />
            ) : null}

            {isError ? (
              <View style={styles.errorBlock}>
                <Text style={styles.errorText}>Не удалось загрузить коллекции</Text>
                <TvFocusable
                  hasTVPreferredFocus={isTvUi()}
                  onPress={() => {
                    void refetch();
                  }}
                  style={styles.option}
                >
                  <Text style={styles.optionLabel}>Повторить</Text>
                </TvFocusable>
              </View>
            ) : null}

            {!isLoading && !isError
              ? collections.map((col, index) => (
                  <TvFocusable
                    key={col.id}
                    disabled={busy}
                    hasTVPreferredFocus={isTvUi() && index === 0}
                    onFocus={() => {
                      focusedRef.current = col.id;
                    }}
                    onBlur={() => {
                      if (focusedRef.current === col.id) focusedRef.current = null;
                    }}
                    onPress={() => pickCollection(col.id)}
                    style={styles.option}
                  >
                    <Text style={styles.optionLabel}>{col.name}</Text>
                    {col.itemCount != null ? (
                      <Text style={styles.optionMeta}>{col.itemCount}</Text>
                    ) : null}
                  </TvFocusable>
                ))
              : null}

            {!isLoading && !isError && collections.length === 0 ? (
              <Text style={styles.empty}>Пока нет коллекций — создайте первую ниже.</Text>
            ) : null}

            {!isLoading && !isError ? (
              <TvFocusable
                disabled={busy}
                hasTVPreferredFocus={isTvUi() && collections.length === 0}
                onFocus={() => {
                  focusedRef.current = 'create';
                }}
                onBlur={() => {
                  if (focusedRef.current === 'create') focusedRef.current = null;
                }}
                onPress={createAndAdd}
                style={[styles.option, styles.createOption]}
              >
                <Text style={styles.optionLabel}>
                  {busy ? 'Сохранение…' : 'Создать и добавить'}
                </Text>
              </TvFocusable>
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TvFocusable
              onFocus={() => {
                focusedRef.current = 'close';
              }}
              onBlur={() => {
                if (focusedRef.current === 'close') focusedRef.current = null;
              }}
              onPress={close}
              style={styles.close}
            >
              <Text style={styles.closeLabel}>Закрыть</Text>
            </TvFocusable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: isTvUi() ? 14 : 10,
    minHeight: isTvUi() ? 48 : 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  chipDone: {
    borderColor: 'rgba(195,192,255,0.55)',
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  chipLabel: {
    color: '#fff',
    fontSize: isTvUi() ? 16 : 13,
    fontWeight: '600',
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  iconBtnDone: {
    borderColor: 'rgba(195,192,255,0.55)',
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  iconLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    zIndex: 2,
    elevation: 8,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  sheetSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  empty: {
    color: colors.textSecondary,
    fontSize: 14,
    marginVertical: spacing.sm,
  },
  errorBlock: { gap: spacing.sm, marginVertical: spacing.sm },
  errorText: {
    color: colors.danger,
    fontSize: 14,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: isTvUi() ? spacing.lg : spacing.md,
    minHeight: isTvUi() ? 52 : undefined,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  createOption: {
    borderWidth: 1,
    borderColor: 'rgba(195,192,255,0.35)',
    backgroundColor: 'rgba(195,192,255,0.08)',
  },
  optionLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  optionMeta: {
    color: colors.textMuted,
    fontSize: 13,
    marginLeft: spacing.sm,
  },
  close: {
    marginTop: spacing.sm,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  closeLabel: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
