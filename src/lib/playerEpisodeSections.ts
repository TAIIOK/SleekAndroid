import type { PlayerEpisodeNavItem } from '@/components/player/types';

export type PlayerEpisodeSection = {
  season?: number;
  items: { item: PlayerEpisodeNavItem; index: number }[];
};

export function buildEpisodeSections(items: PlayerEpisodeNavItem[]): PlayerEpisodeSection[] {
  const seasons = new Set<number>();
  for (const item of items) {
    if (item.season != null) seasons.add(item.season);
  }

  if (seasons.size <= 1) {
    return [
      {
        season: seasons.size === 1 ? [...seasons][0] : undefined,
        items: items.map((item, index) => ({ item, index })),
      },
    ];
  }

  const bySeason = new Map<number, { item: PlayerEpisodeNavItem; index: number }[]>();
  items.forEach((item, index) => {
    const season = item.season ?? 0;
    const list = bySeason.get(season) ?? [];
    list.push({ item, index });
    bySeason.set(season, list);
  });

  return [...bySeason.entries()]
    .sort(([a], [b]) => a - b)
    .map(([season, sectionItems]) => ({ season, items: sectionItems }));
}
