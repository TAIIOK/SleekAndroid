import {
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';
import { useNativeApkUpdate } from '@/hooks/useNativeApkUpdate';
import { getLocalVersionName } from '@/lib/nativeApkUpdate';
import { isTvUi } from '@/lib/isTvUi';

/** Prompt when a newer APK is published in releases/latest.json. */
export function NativeApkUpdatePrompt() {
  const { updateReady, manifest, opening, dismiss, download } = useNativeApkUpdate();
  const local = getLocalVersionName();

  return (
    <Modal transparent animationType="fade" visible={updateReady} onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Доступно обновление</Text>
          <Text style={styles.body}>
            Установлена версия {local}
            {manifest ? `, доступна ${manifest.versionName}` : ''}. Скачайте новый APK, чтобы обновить
            приложение.
          </Text>
          {manifest?.changelog ? <Text style={styles.changelog}>{manifest.changelog}</Text> : null}
          <View style={styles.actions}>
            <TvFocusable style={styles.later} onPress={dismiss} disabled={opening}>
              <Text style={styles.laterLabel}>Позже</Text>
            </TvFocusable>
            <TvFocusable
              style={styles.reload}
              onPress={() => {
                void download();
              }}
              disabled={opening}
              hasTVPreferredFocus
            >
              <Text style={styles.reloadLabel}>{opening ? 'Открытие…' : 'Скачать'}</Text>
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
    fontSize: isTvUi() ? 24 : 20,
    fontWeight: '700',
  },
  body: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  changelog: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
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
