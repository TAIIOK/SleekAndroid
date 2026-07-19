import { Modal, Platform, StyleSheet, Text, View } from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing, tvFocus } from '@/constants/aniverse';

interface LogoutConfirmProps {
  visible: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LogoutConfirm({ visible, loading, onConfirm, onCancel }: LogoutConfirmProps) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Выйти из аккаунта?</Text>
          <Text style={styles.body}>Сессия на этом устройстве будет завершена.</Text>
          <View style={styles.actions}>
            <TvFocusable
              hasTVPreferredFocus={Platform.isTV}
              style={styles.cancel}
              focusedStyle={styles.cancelFocused}
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={styles.cancelLabel}>Отмена</Text>
            </TvFocusable>
            <TvFocusable
              style={styles.confirm}
              focusedStyle={styles.confirmFocused}
              onPress={onConfirm}
              disabled={loading}
            >
              <Text style={styles.confirmLabel}>{loading ? 'Выход…' : 'Выйти'}</Text>
            </TvFocusable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.stroke,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: Platform.isTV ? 24 : 20,
    fontWeight: '700',
  },
  body: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  cancel: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.bgLow,
    alignItems: 'center',
  },
  cancelFocused: {
    borderColor: tvFocus.borderColor,
    backgroundColor: tvFocus.fill,
  },
  cancelLabel: {
    color: colors.text,
    fontWeight: '600',
    fontSize: Platform.isTV ? 18 : 15,
  },
  confirm: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: '#7f1d1d',
    alignItems: 'center',
  },
  confirmFocused: {
    borderColor: tvFocus.borderColor,
    backgroundColor: '#991b1b',
  },
  confirmLabel: {
    color: '#fecaca',
    fontWeight: '700',
    fontSize: Platform.isTV ? 18 : 15,
  },
});
