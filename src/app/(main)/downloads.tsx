import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radii, spacing } from '@/constants/aniverse';
import { useDownloadQueue } from '@/hooks/useDownloadQueue';
import { getDownloadService } from '@/services/download';
import {
  isActiveDownloadState,
  isCompletedDownloadState,
  isPausedDownloadState,
  type DownloadRecord,
} from '@/services/download/types';
import { setLampaWatchPayload } from '@/lib/watchStore';
import { isTvUi } from '@/lib/isTvUi';

export default function DownloadsScreen() {
  const router = useRouter();
  const { records } = useDownloadQueue();
  const [busy, setBusy] = useState(false);
  const svc = getDownloadService();

  useEffect(() => {
    void svc.init();
  }, [svc]);

  const activeDownloads = useMemo(
    () => records.filter((record) => isActiveDownloadState(record.state)),
    [records],
  );
  const pausedDownloads = useMemo(
    () => records.filter((record) => isPausedDownloadState(record.state)),
    [records],
  );
  const inProgress = useMemo(
    () => [...activeDownloads, ...pausedDownloads],
    [activeDownloads, pausedDownloads],
  );
  const completedDownloads = useMemo(
    () =>
      records.filter(
        (record) => isCompletedDownloadState(record.state) || record.state === 'failed',
      ),
    [records],
  );

  const runBusy = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const playLocal = async (record: DownloadRecord) => {
    const url = await svc.getLocalPlaybackUrl(record.id);
    if (!url || record.contentType === 'manga') return;
    const lampaKind = record.lampaKind === 'tv' ? 'tv' : 'movie';
    setLampaWatchPayload({
      lampaLinks: [{ quality: record.quality ?? 'auto', urls: [url] }],
      lampaId: record.lampaId ?? '',
      lampaKind,
      lampaTitle: record.title,
      season: record.season,
      episode: record.episode,
    });
    router.push('/watch/lampa');
  };

  const clearCompleted = () => {
    Alert.alert('Очистить список?', 'Удалить все завершённые и ошибочные загрузки?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => void runBusy(() => svc.clearCompleted()),
      },
    ]);
  };

  if (isTvUi()) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Загрузки</Text>
        <Text style={styles.muted}>На TV загрузки недоступны</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Загрузки</Text>
        <View style={styles.headerActions}>
          {activeDownloads.length > 0 ? (
            <HeaderBtn
              label="Пауза все"
              disabled={busy}
              onPress={() => void runBusy(() => svc.pauseAll())}
            />
          ) : null}
          {pausedDownloads.length > 0 ? (
            <HeaderBtn
              label="Продолжить"
              disabled={busy}
              onPress={() => void runBusy(() => svc.resumeAll())}
            />
          ) : null}
          {completedDownloads.length > 0 ? (
            <HeaderBtn label="Очистить" disabled={busy} onPress={clearCompleted} />
          ) : null}
        </View>
      </View>

      {inProgress.length > 0 ? (
        <Section title="Активные загрузки">
          {inProgress.map((record) => (
            <DownloadCard
              key={record.id}
              record={record}
              onPause={() => void svc.pause(record.id)}
              onResume={() => void svc.resume(record.id)}
              onCancel={() => void svc.cancel(record.id)}
            />
          ))}
        </Section>
      ) : null}

      <Section title="Загружено на устройство">
        {!records.length ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Загрузок пока нет</Text>
            <Text style={styles.muted}>
              Скачайте фильм или серию из меню источника — файл появится здесь.
            </Text>
            <Pressable style={styles.primaryBtn} onPress={() => router.push('/')}>
              <Text style={styles.primaryBtnLabel}>На главную</Text>
            </Pressable>
          </View>
        ) : completedDownloads.length === 0 && inProgress.length > 0 ? (
          <Text style={styles.muted}>
            Завершённые загрузки появятся здесь после окончания скачивания.
          </Text>
        ) : (
          completedDownloads.map((record) => (
            <DownloadCard
              key={record.id}
              record={record}
              onPlay={
                record.state === 'completed' ? () => void playLocal(record) : undefined
              }
              onRemove={() => void svc.remove(record.id)}
            />
          ))
        )}
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function HeaderBtn({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.headerBtn, disabled && styles.btnDisabled]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={styles.headerBtnLabel}>{label}</Text>
    </Pressable>
  );
}

function DownloadCard({
  record,
  onPause,
  onResume,
  onCancel,
  onPlay,
  onRemove,
}: {
  record: DownloadRecord;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onPlay?: () => void;
  onRemove?: () => void;
}) {
  const progressPct = Math.round((record.progress ?? 0) * 100);
  const statusLabel =
    record.state === 'downloading'
      ? `${progressPct}%`
      : record.state === 'queued'
        ? 'В очереди'
        : record.state === 'paused'
          ? 'На паузе'
          : record.state === 'completed'
            ? 'Готово'
            : record.state === 'failed'
              ? record.error ?? 'Ошибка'
              : record.state;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {record.title}
        </Text>
        <Text style={styles.cardStatus}>{statusLabel}</Text>
      </View>
      {record.state === 'downloading' || record.state === 'queued' ? (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.max(progressPct, 4)}%` }]} />
        </View>
      ) : null}
      <View style={styles.cardActions}>
        {onPlay ? (
          <ActionBtn label="Смотреть" onPress={onPlay} />
        ) : null}
        {onPause ? <ActionBtn label="Пауза" onPress={onPause} /> : null}
        {onResume ? <ActionBtn label="Продолжить" onPress={onResume} /> : null}
        {onCancel ? <ActionBtn label="Отмена" onPress={onCancel} danger /> : null}
        {onRemove ? <ActionBtn label="Удалить" onPress={onRemove} danger /> : null}
      </View>
    </View>
  );
}

function ActionBtn({
  label,
  onPress,
  danger,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={styles.actionBtn}>
      <Text style={[styles.actionLabel, danger && styles.actionDanger]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg,
    padding: spacing.xxl,
  },
  headerRow: {
    gap: spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  headerBtn: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerBtnLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  btnDisabled: { opacity: 0.5 },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  muted: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  section: { gap: spacing.md },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionBody: { gap: spacing.md },
  empty: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  primaryBtn: {
    backgroundColor: colors.brand,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  primaryBtnLabel: {
    color: colors.brandOn,
    fontWeight: '700',
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardTitle: {
    flex: 1,
    color: colors.text,
    fontWeight: '600',
    fontSize: 15,
  },
  cardStatus: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.bgLow,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.brand,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  actionLabel: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: '600',
  },
  actionDanger: {
    color: colors.danger,
  },
});
