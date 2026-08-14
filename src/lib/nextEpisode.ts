const DATE_KEYS = [
  'nextEpisodeDate',
  'nextEpisodeAt',
  'next_episode_date',
  'next_episode_at',
] as const;

const NESTED_KEYS = ['nextAiringEpisode', 'next_airing_episode'] as const;

export interface RemainingParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

export interface CountdownUnit {
  value: string;
  label: string;
}

export function parseDateValue(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = Math.abs(value) < 1e12 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim();
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return parseDateValue(Number(trimmed));
    }
    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) return new Date(parsed);
  }

  return undefined;
}

export function parseNextEpisodeDate(raw: unknown): Date | undefined {
  const direct = parseDateValue(raw);
  if (direct) return direct;
  if (!raw || typeof raw !== 'object') return undefined;

  const obj = raw as Record<string, unknown>;
  for (const key of DATE_KEYS) {
    const date = parseDateValue(obj[key]);
    if (date) return date;
  }

  for (const key of NESTED_KEYS) {
    const nested = obj[key];
    if (!nested || typeof nested !== 'object') continue;
    const rec = nested as Record<string, unknown>;
    const date = parseDateValue(rec.airingAt ?? rec.airing_at);
    if (date) return date;
  }

  return undefined;
}

export function shouldShowNextEpisode(date: Date | undefined, now = new Date()): boolean {
  return date != null && date.getTime() > now.getTime();
}

export function nextEpisodeNumber(episodesAired?: number): number | undefined {
  if (episodesAired == null || !Number.isFinite(episodesAired) || episodesAired < 0) {
    return undefined;
  }
  return Math.trunc(episodesAired) + 1;
}

export function remainingParts(ms: number): RemainingParts {
  const totalMs = Math.max(0, Math.floor(ms));
  const totalSeconds = Math.floor(totalMs / 1000);
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
    totalMs,
  };
}

export function countdownUnits(parts: RemainingParts): CountdownUnit[] {
  const units: CountdownUnit[] = [];
  if (parts.days > 0) {
    units.push({ value: String(parts.days).padStart(2, '0'), label: 'д' });
  }
  units.push(
    { value: String(parts.hours).padStart(2, '0'), label: 'ч' },
    { value: String(parts.minutes).padStart(2, '0'), label: 'м' },
    { value: String(parts.seconds).padStart(2, '0'), label: 'с' },
  );
  return units;
}

export function formatNextEpisodeDateTime(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
