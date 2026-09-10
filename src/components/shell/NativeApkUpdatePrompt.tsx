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
  const { updateReady, manifest, phase, progress, error, cached, dismiss, download, openInBrowser } =
    useNativeApkUpdate();
  const local = getLocalVersionName();
  const busy = phase === 'downloading' || phase === 'installing';

  let actionLabel = 'Обновить';
  if (phase === 'downloading') {
    actionLabel = progress ? `Загрузка ${progress.percentLabel}` : 'Загрузка…';
  } else if (phase === 'installing') {
    actionLabel = 'Установка…';
  } else if (phase === 'error') {
    actionLabel = 'Повторить';
  } else if (cached) {
    actionLabel = 'Установить';
  }

  return (
    <Modal transparent animationType="fade" visible={updateReady} onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Доступно обновление</Text>
          <Text style={styles.body}>
            Установлена версия {local}
            {manifest ? `, доступна ${manifest.versionName}` : ''}. Загрузка и установка пройдут в
            приложении.
          </Text>
          {manifest?.changelog ? <Text style={styles.changelog}>{manifest.changelog}</Text> : null}

          {phase === 'downloading' ? (
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <View
                  style={[styles.progressFill, { width: `${Math.round((progress?.ratio ?? 0) * 100)}%` }]}
                />
              </View>
              <Text style={styles.progressLabel}>
                {progress ? `${progress.percentLabel} · ${progress.bytesLabel}` : 'Подключение…'}
              </Text>
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <TvFocusable style={styles.later} onPress={dismiss} disabled={phase === 'installing'}>
              <Text style={styles.laterLabel}>{phase === 'downloading' ? 'Отмена' : 'Позже'}</Text>
            </TvFocusable>
            <TvFocusable
              style={styles.reload}
              onPress={() => {
                void download();
              }}
              disabled={busy}
              hasTVPreferredFocus
            >
              <Text style={styles.reloadLabel}>{actionLabel}</Text>
            </TvFocusable>
          </View>

          {phase === 'error' ? (
            <TvFocusable style={styles.browser} onPress={() => void openInBrowser()}>
              <Text style={styles.browserLabel}>Скачать в браузере</Text>
            </TvFocusable>
          ) : null}
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
  progressWrap: {
    gap: spacing.sm,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.bgLow,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.brandAccent,
    borderRadius: 4,
  },
  progressLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  error: {
    color: colors.danger,
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
  browser: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.bgLow,
    alignItems: 'center',
  },
  browserLabel: { color: colors.textSecondary, fontWeight: '600' },
});
