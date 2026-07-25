/**
 * Last-known media duration for progress rows (fraction alone can't show clock time).
 * In-memory + AsyncStorage; hydrate early so Continue Watching can label m:ss.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'aniverse.playback.duration.v1';
const MAX_ENTRIES = 400;

const memory = new Map<string, number>();
let hydratePromise: Promise<void> | null = null;

function trimMap(map: Map<string, number>): void {
  if (map.size <= MAX_ENTRIES) return;
  const overflow = map.size - MAX_ENTRIES;
  const keys = map.keys();
  for (let i = 0; i < overflow; i += 1) {
    const key = keys.next().value;
    if (key != null) map.delete(key);
  }
}

function ingest(raw: string | null): void {
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'number' && value > 1 && Number.isFinite(value)) {
        memory.set(key, value);
      }
    }
    trimMap(memory);
  } catch {
    /* ignore */
  }
}

function persist(): void {
  const obj: Record<string, number> = {};
  for (const [key, value] of memory) obj[key] = value;
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(obj)).catch(() => undefined);
}

/** Fire-and-forget hydrate (safe to call many times). */
export function hydratePlaybackDurations(): Promise<void> {
  if (hydratePromise) return hydratePromise;
  hydratePromise = AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      ingest(raw);
    })
    .catch(() => undefined);
  return hydratePromise;
}

void hydratePlaybackDurations();

export function animePlaybackDurationKey(animeId: number, episodeId: number): string {
  return `anime:${animeId}:${episodeId}`;
}

export function lampaPlaybackDurationKey(
  lampaId: string,
  seasonOrdinal: number,
  episodeOrdinal: number,
): string {
  return `lampa:${lampaId.trim()}:${seasonOrdinal}:${episodeOrdinal}`;
}

export function rememberPlaybackDuration(key: string, durationSec: number): void {
  const trimmed = key.trim();
  if (!trimmed || !(durationSec > 1) || !Number.isFinite(durationSec)) return;
  const prev = memory.get(trimmed);
  if (prev != null && Math.abs(prev - durationSec) < 0.5) return;
  memory.set(trimmed, durationSec);
  trimMap(memory);
  persist();
}

export function getPlaybackDuration(key: string): number | undefined {
  const value = memory.get(key.trim());
  return value != null && value > 1 ? value : undefined;
}
