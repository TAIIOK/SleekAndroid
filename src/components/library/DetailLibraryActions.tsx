import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Modal,
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
import { isTvUi } from '@/lib/isTvUi';

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
 * Library status (dropdown) + favorite / collection icons.
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
  const tv = isTvUi();

  const closeMenu = useCallback(() => {
    focusedStatusRef.current = null;
    pickingRef.current = false;
    setMenuOpen(false);
  }, []);

  const pickStatus = useCallback(
    (value: UserListStatus) => {
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
    if (!menuOpen || !tv) return;
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
            hasTVPreferredFocus={tv && index === 0}
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
            <Text style={styles.optionLabel}>
              {option.icon} {option.label}
            </Text>
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
        style={[styles.dropdown, userStatus ? styles.dropdownActive : null]}
      >
        <Text style={styles.dropdownLabel} numberOfLines={1}>
          {statusLabel}
        </Text>
        <Text style={styles.dropdownChevron}>▾</Text>
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
    gap: isTvUi() ? spacing.sm : 6,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isTvUi() ? 8 : 6,
    paddingHorizontal: isTvUi() ? spacing.lg : 10,
    paddingVertical: isTvUi() ? 14 : 8,
    minHeight: isTvUi() ? 48 : undefined,
    borderRadius: isTvUi() ? radii.md : 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  dropdownActive: {
    borderColor: 'rgba(195,192,255,0.5)',
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  dropdownLabel: {
    color: colors.text,
    fontSize: isTvUi() ? 15 : 12,
    fontWeight: '600',
    maxWidth: isTvUi() ? 160 : 100,
  },
  dropdownChevron: {
    color: colors.textSecondary,
    fontSize: isTvUi() ? 14 : 11,
    marginTop: 1,
  },
  iconBtn: {
    width: isTvUi() ? 48 : 32,
    height: isTvUi() ? 48 : 32,
    borderRadius: isTvUi() ? 14 : 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  iconBtnActive: {
    borderColor: 'rgba(195,192,255,0.55)',
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  iconLabel: {
    color: colors.brand,
    fontSize: isTvUi() ? 20 : 15,
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
    paddingVertical: isTvUi() ? spacing.lg : spacing.md,
    minHeight: isTvUi() ? 52 : undefined,
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
