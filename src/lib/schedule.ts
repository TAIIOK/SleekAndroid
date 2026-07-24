import type { AnimeScheduleEntry } from '@/api/catalog';
import { animePoster } from '@/lib/poster';
import type { RailItem } from '@/components/catalog/PosterRail';

const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

export interface ScheduleDayGroup {
  key: string;
  label: string;
  date: Date;
  items: RailItem[];
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function mondayOfWeek(date: Date): Date {
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  const monday = startOfLocalDay(date);
  monday.setDate(monday.getDate() + offset);
  return monday;
}

export function scheduleWeekLabel(weekOffset: number, reference = new Date()): string {
  const monday = mondayOfWeek(reference);
  monday.setDate(monday.getDate() + weekOffset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  if (weekOffset === 0) return `Эта неделя · ${fmt(monday)} – ${fmt(sunday)}`;
  if (weekOffset === 1) return `Следующая · ${fmt(monday)} – ${fmt(sunday)}`;
  if (weekOffset === -1) return `Прошлая · ${fmt(monday)} – ${fmt(sunday)}`;
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

export function groupScheduleByDay(
  entries: AnimeScheduleEntry[],
  weekOffset = 0,
  reference = new Date(),
): ScheduleDayGroup[] {
  const monday = mondayOfWeek(reference);
  monday.setDate(monday.getDate() + weekOffset * 7);

  const groups: ScheduleDayGroup[] = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      key: date.toISOString().slice(0, 10),
      label: DAY_LABELS[index] ?? `День ${index + 1}`,
      date,
      items: [],
    };
  });

  const byKey = new Map(groups.map((group) => [group.key, group]));

  for (const entry of entries) {
    const anime = entry.anime;
    const animeId = Number(anime?.id ?? entry.anime_id);
    if (!Number.isFinite(animeId) || animeId <= 0) continue;

    const nextDate = Number(entry.next_date);
    if (!Number.isFinite(nextDate) || nextDate <= 0) continue;

    const airDate = startOfLocalDay(new Date(nextDate * 1000));
    const key = airDate.toISOString().slice(0, 10);
    const group = byKey.get(key);
    if (!group) continue;

    group.items.push({
      id: animeId,
      animeId,
      title: anime?.title ?? 'Без названия',
      poster: anime ? animePoster(anime) : undefined,
      score: typeof anime?.score === 'number' ? anime.score : undefined,
    });
  }

  return groups.filter((group) => group.items.length > 0);
}

export function formatScheduleDayTitle(group: ScheduleDayGroup, reference = new Date()): string {
  const today = startOfLocalDay(reference).getTime();
  const day = startOfLocalDay(group.date).getTime();
  const dateLabel = group.date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  });
  if (day === today) return `Сегодня · ${group.label} · ${dateLabel}`;
  if (day === today + 86_400_000) return `Завтра · ${group.label} · ${dateLabel}`;
  return `${group.label} · ${dateLabel}`;
}
