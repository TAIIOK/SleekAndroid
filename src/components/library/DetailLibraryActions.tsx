import { useState, type ReactNode } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';
import {
  LIBRARY_STATUS_OPTIONS,
  libraryStatusLabel,
  type UserListStatus,
} from '@/lib/libraryStatus';

interface DetailLibraryActionsProps {
  userStatus?: string;
  isFavorite?: boolean;
  disabled?: boolean;
  onStatusChange: (status: UserListStatus) => void;
  onToggleFavorite: () => void;
  extraActions?: ReactNode;
}

export function DetailLibraryActions({
  userStatus,
  isFavorite = false,
  disabled,
  onStatusChange,
  onToggleFavorite,
  extraActions,
}: DetailLibraryActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const statusLabel = libraryStatusLabel(userStatus) ?? 'В список';

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

      {extraActions}

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Статус в списке</Text>
            {LIBRARY_STATUS_OPTIONS.map((option) => {
              const active = userStatus === option.value;
              return (
                <TvFocusable
                  key={option.value}
                  onPress={() => {
                    onStatusChange(option.value);
                    setMenuOpen(false);
                  }}
                  style={[styles.option, active && styles.optionActive]}
                >
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  {active ? <Text style={styles.check}>✓</Text> : null}
                </TvFocusable>
              );
            })}
            <TvFocusable onPress={() => setMenuOpen(false)} style={styles.close}>
              <Text style={styles.closeLabel}>Закрыть</Text>
            </TvFocusable>
          </View>
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
    paddingVertical: spacing.md,
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
