import { Modal, Platform, StyleSheet, Text, View } from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';

export function HistoryClearConfirm({
  visible,
  loading,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Очистить историю?</Text>
          <Text style={styles.body}>Записи будут скрыты из списка на этом устройстве.</Text>
          <View style={styles.actions}>
            <TvFocusable
              style={styles.cancel}
              onPress={onCancel}
              disabled={loading}
              hasTVPreferredFocus
            >
              <Text style={styles.cancelLabel}>Отмена</Text>
            </TvFocusable>
            <TvFocusable style={styles.confirm} onPress={onConfirm} disabled={loading}>
              <Text style={styles.confirmLabel}>{loading ? 'Очистка…' : 'Очистить'}</Text>
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
  cancelLabel: { color: colors.text, fontWeight: '600' },
  confirm: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.brandAccent,
    alignItems: 'center',
  },
  confirmLabel: { color: colors.text, fontWeight: '700' },
});
