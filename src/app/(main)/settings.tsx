import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Updates from 'expo-updates';

import { ProfileSection } from '@/components/profile/ProfileSection';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing, tvFocus } from '@/constants/aniverse';
import { API_BASE, BOOSTY_URL, SITE_PUBLIC_URL } from '@/lib/config';
import { isTvUi } from '@/lib/isTvUi';
import {
  loadPlayerPreferences,
  savePlayerPreferences,
  type PlayerPreferences,
} from '@/lib/playerPreferences';
import { flushProgressQueue, getProgressQueueLength } from '@/lib/progressQueue';
import { useAuth } from '@/providers/AuthProvider';
import { useMobileChromeScrollProps } from '@/providers/MobileChromeScroll';
import { queryClient } from '@/providers/QueryProvider';

export default function SettingsScreen() {
  const router = useRouter();
  const { refreshUser, clearSubscriptionBlock } = useAuth();
  const chromeScrollProps = useMobileChromeScrollProps(undefined, styles.content);
  const [prefs, setPrefs] = useState<PlayerPreferences | null>(null);
  const [queueLen, setQueueLen] = useState(0);
  const [busy, setBusy] = useState(false);

  const version = Constants.expoConfig?.version ?? '—';
  const channel =
    Constants.expoConfig?.updates?.requestHeaders?.['expo-channel-name'] ??
    (Updates.channel || '—');

  const load = useCallback(async () => {
    setPrefs(await loadPlayerPreferences());
    setQueueLen(await getProgressQueueLength());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const togglePref = async (patch: Partial<PlayerPreferences>) => {
    const next = await savePlayerPreferences(patch);
    setPrefs(next);
  };

  const clearCache = async () => {
    setBusy(true);
    try {
      queryClient.clear();
      Alert.alert('Готово', 'Кэш запросов очищен');
    } finally {
      setBusy(false);
    }
  };

  const flushQueue = async () => {
    setBusy(true);
    try {
      const ok = await flushProgressQueue();
      setQueueLen(await getProgressQueueLength());
      Alert.alert('Синхронизация', ok > 0 ? `Отправлено: ${ok}` : 'Очередь пуста или сеть недоступна');
    } finally {
      setBusy(false);
    }
  };

  const refreshSub = async () => {
    setBusy(true);
    try {
      await refreshUser();
      clearSubscriptionBlock();
      Alert.alert('Подписка', 'Статус обновлён');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} {...chromeScrollProps}>
      <Text style={styles.title}>Настройки</Text>

      <ProfileSection title="Плеер">
        <PrefRow
          label="Автопереход к следующей серии"
          value={prefs?.autoPlayNext ?? true}
          onToggle={() => void togglePref({ autoPlayNext: !(prefs?.autoPlayNext ?? true) })}
        />
        <PrefRow
          label="Автопропуск опенинга"
          value={prefs?.autoSkipOpening ?? false}
          onToggle={() => void togglePref({ autoSkipOpening: !(prefs?.autoSkipOpening ?? false) })}
        />
        <PrefRow
          label="Автопропуск эндинга"
          value={prefs?.autoSkipEnding ?? false}
          onToggle={() => void togglePref({ autoSkipEnding: !(prefs?.autoSkipEnding ?? false) })}
        />
      </ProfileSection>

      <ProfileSection title="Данные">
        <TvFocusable
          style={styles.row}
          focusedStyle={styles.rowFocused}
          disabled={busy}
          onPress={() => void flushQueue()}
        >
          <Text style={styles.rowLabel}>Синхронизировать прогресс</Text>
          <Text style={styles.rowMeta}>В очереди: {queueLen}</Text>
        </TvFocusable>
        <TvFocusable
          style={styles.row}
          focusedStyle={styles.rowFocused}
          disabled={busy}
          onPress={() => void clearCache()}
        >
          <Text style={styles.rowLabel}>Очистить кэш каталога</Text>
        </TvFocusable>
        <TvFocusable
          style={styles.row}
          focusedStyle={styles.rowFocused}
          disabled={busy}
          onPress={() => void refreshSub()}
        >
          <Text style={styles.rowLabel}>Обновить статус подписки</Text>
        </TvFocusable>
      </ProfileSection>

      <ProfileSection title="О приложении">
        <View style={styles.infoCard}>
          <InfoLine label="Версия" value={version} />
          <InfoLine label="OTA channel" value={String(channel)} />
          <InfoLine label="API" value={API_BASE} />
          <InfoLine label="Сайт" value={SITE_PUBLIC_URL} />
          <InfoLine label="Boosty" value={BOOSTY_URL} />
        </View>
      </ProfileSection>

      <TvFocusable
        style={styles.back}
        focusedStyle={styles.rowFocused}
        onPress={() => router.back()}
      >
        <Text style={styles.backText}>Назад</Text>
      </TvFocusable>
    </ScrollView>
  );
}

function PrefRow({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <TvFocusable style={styles.row} focusedStyle={styles.rowFocused} onPress={onToggle}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowMeta}>{value ? 'Вкл' : 'Выкл'}</Text>
    </TvFocusable>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  title: {
    color: colors.text,
    fontSize: isTvUi() ? 28 : 22,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  row: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rowFocused: {
    borderColor: tvFocus.borderColor,
    backgroundColor: tvFocus.fill,
  },
  rowLabel: {
    color: colors.text,
    fontSize: isTvUi() ? 18 : 15,
    fontWeight: '600',
    flex: 1,
  },
  rowMeta: {
    color: colors.textSecondary,
    fontSize: isTvUi() ? 16 : 13,
  },
  infoCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  infoRow: { gap: 2 },
  infoLabel: { color: colors.textSecondary, fontSize: 12 },
  infoValue: { color: colors.text, fontSize: isTvUi() ? 16 : 13 },
  back: {
    marginTop: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
  },
  backText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: isTvUi() ? 18 : 15,
  },
});
