/**
 * Local title/poster cache written when playback starts (site parity).
 * Progress APIs do not return artwork — Continue Watching reads this map.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

export type WatchHistoryMetaKind = 'anime' | 'movie' | 'tv';

export interface WatchHistoryMeta {
  title?: string;
  poster?: string;
  kind?: WatchHistoryMetaKind;
  updatedAt: string;
}

const STORAGE_KEY = 'aniverse.watch.history.meta.v1';
const MAX_ENTRIES = 200;

let memory: Record<string, WatchHistoryMeta> = {};
let hydratePromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function ingest(raw: string | null): void {
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
    memory = parsed as Record<string, WatchHistoryMeta>;
  } catch {
    /* ignore */
  }
}

function persist(): void {
  const entries = Object.entries(memory).sort(
    (left, right) => Date.parse(right[1].updatedAt) - Date.parse(left[1].updatedAt),
  );
  memory = Object.fromEntries(entries.slice(0, MAX_ENTRIES));
  notify();
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(memory)).catch(() => undefined);
}

export function hydrateWatchHistoryMeta(): Promise<void> {
  if (hydratePromise) return hydratePromise;
  hydratePromise = AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      ingest(raw);
      notify();
    })
    .catch(() => undefined);
  return hydratePromise;
}

void hydrateWatchHistoryMeta();

export function animeWatchHistoryKey(animeId: number): string {
  return `anime:${animeId}`;
}

export function lampaWatchHistoryKey(lampaId: string): string {
  return `lampa:${lampaId.trim()}`;
}

export function rememberWatchHistoryMeta(
  key: string,
  meta: Omit<WatchHistoryMeta, 'updatedAt'>,
): void {
  const trimmed = key.trim();
  if (!trimmed) return;

  const title = meta.title?.trim();
  const poster = meta.poster?.trim();
  const kind = meta.kind;
  if (!title && !poster && !kind) return;

  const prev = memory[trimmed];
  memory[trimmed] = {
    title: title || prev?.title,
    poster: poster || prev?.poster,
    kind: kind ?? prev?.kind,
    updatedAt: new Date().toISOString(),
  };
  persist();
}

export function getWatchHistoryMeta(key: string): WatchHistoryMeta | undefined {
  const trimmed = key.trim();
  if (!trimmed) return undefined;
  return memory[trimmed];
}

export function subscribeWatchHistoryMeta(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Bumps when the local poster cache hydrates or a title is remembered. */
export function useWatchHistoryMetaTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    void hydrateWatchHistoryMeta().then(() => setTick((value) => value + 1));
    return subscribeWatchHistoryMeta(() => setTick((value) => value + 1));
  }, []);
  return tick;
}
