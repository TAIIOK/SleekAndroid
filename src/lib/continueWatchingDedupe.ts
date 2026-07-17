import type { ContinueWatchingItem } from '@/lib/continueWatching';

export interface ContinueWatchingDedupeKeys {
  animeIds: ReadonlySet<number>;
  lampaKeys: ReadonlySet<string>;
}

export function buildContinueWatchingDedupeKeys(
  items: ContinueWatchingItem[],
): ContinueWatchingDedupeKeys {
  const animeIds = new Set<number>();
  const lampaKeys = new Set<string>();

  for (const item of items) {
    if (item.kind === 'anime' && item.animeId) {
      animeIds.add(item.animeId);
      continue;
    }

    if (item.kind !== 'movie' && item.kind !== 'tv') continue;

    const prefix = `lampa-${item.kind}-`;
    if (item.id.startsWith(prefix)) {
      lampaKeys.add(`${item.kind}:${item.id.slice(prefix.length)}`);
    }
  }

  return { animeIds, lampaKeys };
}
