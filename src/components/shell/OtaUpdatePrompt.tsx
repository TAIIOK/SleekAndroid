import { Modal, Platform, StyleSheet, Text, View } from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';
import { useOtaUpdate } from '@/hooks/useOtaUpdate';

/** TV-friendly prompt when an OTA update has been downloaded and is ready to apply. */
export function OtaUpdatePrompt() {
  const { updateReady, reloading, dismiss, reload } = useOtaUpdate();

  return (
    <Modal transparent animationType="fade" visible={updateReady} onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Доступно обновление</Text>
          <Text style={styles.body}>
            Новая версия приложения уже загружена. Перезапустите, чтобы применить изменения.
          </Text>
          <View style={styles.actions}>
            <TvFocusable style={styles.later} onPress={dismiss} disabled={reloading}>
              <Text style={styles.laterLabel}>Позже</Text>
            </TvFocusable>
            <TvFocusable
              style={styles.reload}
              onPress={() => {
                void reload();
              }}
              disabled={reloading}
              hasTVPreferredFocus
            >
              <Text style={styles.reloadLabel}>{reloading ? 'Перезапуск…' : 'Перезапустить'}</Text>
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
  later: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.bgLow,
    alignItems: 'center',
  },
  laterLabel: { color: colors.text, fontWeight: '600' },
  reload: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.brandAccent,
    alignItems: 'center',
  },
  reloadLabel: { color: colors.text, fontWeight: '700' },
});
