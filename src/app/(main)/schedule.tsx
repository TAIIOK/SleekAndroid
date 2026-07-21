import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fetchSchedule } from '@/api/catalog';
import { PosterRail } from '@/components/catalog/PosterRail';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, radii, spacing, tvFocus } from '@/constants/aniverse';
import {
  formatScheduleDayTitle,
  groupScheduleByDay,
  scheduleWeekLabel,
} from '@/lib/schedule';
import { tvVerticalCatalogScrollProps } from '@/lib/tvCatalogScroll';
import { isTvUi } from '@/lib/isTvUi';

const WEEK_OPTIONS = [
  { offset: 0, label: 'Эта неделя' },
  { offset: 1, label: 'Следующая' },
] as const;

export default function ScheduleScreen() {
  const router = useRouter();
  const [week, setWeek] = useState(0);

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['anime-schedule', week],
    queryFn: () => fetchSchedule(week, 80),
  });

  const dayGroups = useMemo(() => groupScheduleByDay(data, week), [data, week]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      {...tvVerticalCatalogScrollProps}
    >
      <SectionHeader title="Расписание" subtitle={scheduleWeekLabel(week)} showAccent />

      <View style={styles.weeks}>
        {WEEK_OPTIONS.map((option) => (
          <WeekChip
            key={option.offset}
            label={option.label}
            active={week === option.offset}
            onPress={() => setWeek(option.offset)}
          />
        ))}
      </View>

      {isError ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>Не удалось загрузить расписание</Text>
          <Pressable onPress={() => void refetch()} style={styles.retry}>
            <Text style={styles.retryLabel}>Повторить</Text>
          </Pressable>
        </View>
      ) : null}

      {isLoading && !dayGroups.length ? (
        <PosterRail title="Загрузка…" items={[]} loading onItemPress={() => {}} />
      ) : null}

      {!isLoading && !isError && dayGroups.length === 0 ? (
        <Text style={styles.empty}>На эту неделю выходов нет</Text>
      ) : null}

      {dayGroups.map((group) => (
        <PosterRail
          key={group.key}
          title={formatScheduleDayTitle(group)}
          items={group.items}
          onItemPress={(item) => router.push(`/anime/${item.id}`)}
        />
      ))}
    </ScrollView>
  );
}

function WeekChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={[styles.chip, (active || focused) && styles.chipActive, focused && styles.chipFocused]}
    >
      <Text style={styles.chipLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  weeks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: isTvUi() ? spacing.lg : spacing.lg,
    marginBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.bgCard,
    borderWidth: tvFocus.borderWidth,
    borderColor: colors.border,
  },
  chipActive: {
    borderColor: colors.brand,
    backgroundColor: 'rgba(195,192,255,0.12)',
  },
  chipFocused: {
    borderColor: tvFocus.borderColor,
    backgroundColor: tvFocus.fill,
  },
  chipLabel: {
    color: colors.text,
    fontSize: isTvUi() ? 15 : 14,
    fontWeight: '600',
  },
  stateBox: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  stateText: { color: colors.textSecondary },
  retry: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brandAccent,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryLabel: { color: colors.text, fontWeight: '700' },
  empty: {
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
  },
});
