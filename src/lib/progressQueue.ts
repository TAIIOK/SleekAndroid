import AsyncStorage from '@react-native-async-storage/async-storage';

import { putAnimeProgress, putLampaProgress } from '@/api/progress';
import type { AnimeProgressPut, LampaProgressPut } from '@/types/progress';

const QUEUE_KEY = 'aniverse_progress_retry_queue';
const MAX_QUEUE = 40;

type AnimeQueued = { kind: 'anime'; payload: AnimeProgressPut; enqueuedAt: number };
type LampaQueued = { kind: 'lampa'; payload: LampaProgressPut; enqueuedAt: number };
export type ProgressQueueItem = AnimeQueued | LampaQueued;

async function readQueue(): Promise<ProgressQueueItem[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ProgressQueueItem[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(items: ProgressQueueItem[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-MAX_QUEUE)));
}

function dedupeKey(item: ProgressQueueItem): string {
  if (item.kind === 'anime') {
    return `a:${item.payload.animeId}:${item.payload.episodeId}`;
  }
  return `l:${item.payload.lampaId}:${item.payload.seasonOrdinal}:${item.payload.episodeOrdinal}`;
}

async function enqueue(item: ProgressQueueItem): Promise<void> {
  const queue = await readQueue();
  const key = dedupeKey(item);
  const without = queue.filter((row) => dedupeKey(row) !== key);
  without.push(item);
  await writeQueue(without);
}

export async function enqueueAnimeProgress(payload: AnimeProgressPut): Promise<void> {
  await enqueue({ kind: 'anime', payload, enqueuedAt: Date.now() });
}

export async function enqueueLampaProgress(payload: LampaProgressPut): Promise<void> {
  await enqueue({ kind: 'lampa', payload, enqueuedAt: Date.now() });
}

/** Flush queued writes; returns number of successful puts. */
export async function flushProgressQueue(): Promise<number> {
  const queue = await readQueue();
  if (!queue.length) return 0;

  const remaining: ProgressQueueItem[] = [];
  let ok = 0;

  for (const item of queue) {
    try {
      if (item.kind === 'anime') {
        const result = await putAnimeProgress(item.payload, { enqueueOnFail: false });
        if (result === undefined) remaining.push(item);
        else ok += 1;
      } else {
        const result = await putLampaProgress(item.payload, { enqueueOnFail: false });
        if (result === undefined) remaining.push(item);
        else ok += 1;
      }
    } catch {
      remaining.push(item);
    }
  }

  await writeQueue(remaining);
  return ok;
}

export async function getProgressQueueLength(): Promise<number> {
  return (await readQueue()).length;
}
