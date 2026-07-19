import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DetailCollectionPicker } from '@/components/library/DetailCollectionPicker';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';
import { useTvEventHandlerSafe } from '@/lib/tvEventHandler';
import {
  LIBRARY_STATUS_OPTIONS,
  libraryStatusLabel,
  type UserListStatus,
} from '@/lib/libraryStatus';
import type { CollectionItemInput } from '@/types/collection';

interface DetailLibraryActionsProps {
  userStatus?: string;
  isFavorite?: boolean;
  disabled?: boolean;
  onStatusChange: (status: UserListStatus) => void;
  onToggleFavorite: () => void;
  /** When set, shows «В коллекцию» picker for this media item. */
  collectionItem?: CollectionItemInput | null;
  extraActions?: ReactNode;
}

/**
 * Library status + favorite controls.
 * On Android TV, RN Modal often drops Pressable select events — we keep a Modal shell
 * for layering but route Select via TV event handler when an option is focused.
 */
export function DetailLibraryActions({
  userStatus,
  isFavorite = false,
  disabled,
  onStatusChange,
  onToggleFavorite,
  collectionItem,
  extraActions,
}: DetailLibraryActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const focusedStatusRef = useRef<UserListStatus | 'close' | null>(null);
  const pickingRef = useRef(false);
  const statusLabel = libraryStatusLabel(userStatus) ?? 'В список';

  const closeMenu = useCallback(() => {
    focusedStatusRef.current = null;
    pickingRef.current = false;
    setMenuOpen(false);
  }, []);

  const pickStatus = useCallback(
    (value: UserListStatus) => {
      // Guard against Select firing both Pressable.onPress and TV HW event.
      if (pickingRef.current) return;
      pickingRef.current = true;
      focusedStatusRef.current = null;
      onStatusChange(value);
      setMenuOpen(false);
      pickingRef.current = false;
    },
    [onStatusChange],
  );

  useEffect(() => {
    if (!menuOpen) focusedStatusRef.current = null;
  }, [menuOpen]);

  useTvEventHandlerSafe((evt) => {
    if (!menuOpen || !Platform.isTV) return;
    // rn-tvos Android delivers HW events on key-up (action === 1).
    if (evt.eventKeyAction != null && evt.eventKeyAction !== 1) return;
    if (evt.eventType !== 'select' && evt.eventType !== 'playPause') return;

    const focused = focusedStatusRef.current;
    if (focused === 'close') {
      closeMenu();
      return;
    }
    if (focused) {
      pickStatus(focused);
    }
  });

  const sheet = (
    <View style={styles.sheet} focusable={false}>
      <Text style={styles.sheetTitle}>Статус в списке</Text>
      {LIBRARY_STATUS_OPTIONS.map((option, index) => {
        const active = userStatus === option.value;
        return (
          <TvFocusable
            key={option.value}
            hasTVPreferredFocus={Platform.isTV && index === 0}
            onFocus={() => {
              focusedStatusRef.current = option.value;
            }}
            onBlur={() => {
              if (focusedStatusRef.current === option.value) {
                focusedStatusRef.current = null;
              }
            }}
            onPress={() => pickStatus(option.value)}
            style={[styles.option, active && styles.optionActive]}
          >
            <Text style={styles.optionLabel}>{option.label}</Text>
            {active ? <Text style={styles.check}>✓</Text> : null}
          </TvFocusable>
        );
      })}
      <TvFocusable
        onFocus={() => {
          focusedStatusRef.current = 'close';
        }}
        onBlur={() => {
          if (focusedStatusRef.current === 'close') {
            focusedStatusRef.current = null;
          }
        }}
        onPress={closeMenu}
        style={styles.close}
      >
        <Text style={styles.closeLabel}>Закрыть</Text>
      </TvFocusable>
    </View>
  );

  return (
    <View style={styles.row}>
      <TvFocusable
        disabled={disabled}
        onPress={() => setMenuOpen(true)}
        style={[styles.chip, userStatus ? styles.chipActive : null]}
      >
        <Text style={styles.chipLabel}>{statusLabel}</Text>
      </TvFocusable>

      <TvFocusable
        disabled={disabled}
        onPress={onToggleFavorite}
        style={[styles.iconBtn, isFavorite && styles.iconBtnActive]}
      >
        <Text style={styles.iconLabel}>{isFavorite ? '★' : '☆'}</Text>
      </TvFocusable>

      {collectionItem ? (
        <DetailCollectionPicker item={collectionItem} disabled={disabled} />
      ) : null}

      {extraActions}

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <View style={styles.backdrop} focusable={false}>
          {/* Non-focusable dismiss layer — must not steal TV Select from options. */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeMenu}
            focusable={false}
            accessible={false}
          />
          {sheet}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: Platform.isTV ? 14 : 12,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  chipActive: {
    borderColor: 'rgba(195,192,255,0.4)',
    backgroundColor: 'rgba(195,192,255,0.1)',
  },
  chipLabel: {
    color: colors.text,
    fontSize: Platform.isTV ? 16 : 14,
    fontWeight: '600',
  },
  iconBtn: {
    width: Platform.isTV ? 52 : 44,
    height: Platform.isTV ? 52 : 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  iconBtnActive: {
    borderColor: 'rgba(195,192,255,0.45)',
    backgroundColor: 'rgba(195,192,255,0.12)',
  },
  iconLabel: {
    color: colors.brand,
    fontSize: Platform.isTV ? 22 : 18,
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
    marginBottom: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.isTV ? spacing.lg : spacing.md,
    minHeight: Platform.isTV ? 52 : undefined,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  optionActive: {
    backgroundColor: 'rgba(79,70,229,0.35)',
  },
  optionLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  check: {
    color: colors.brand,
    fontSize: 16,
    fontWeight: '700',
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
