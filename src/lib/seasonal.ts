/** Anime seasonal paths: winter=1, spring=2, summer=3, fall=4 */

export type AnimeSeasonId = 1 | 2 | 3 | 4;

export function currentAnimeSeason(date = new Date()): { year: number; season: AnimeSeasonId } {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  if (month <= 3) return { year, season: 1 };
  if (month <= 6) return { year, season: 2 };
  if (month <= 9) return { year, season: 3 };
  return { year, season: 4 };
}

export function animeSeasonLabel(season: AnimeSeasonId): string {
  switch (season) {
    case 1:
      return 'Зима';
    case 2:
      return 'Весна';
    case 3:
      return 'Лето';
    case 4:
      return 'Осень';
  }
}

export function currentSeasonalShowcase(date = new Date()): {
  id: string;
  name: string;
  path: string;
} {
  const { year, season } = currentAnimeSeason(date);
  return {
    id: `seasonal-${year}-${season}`,
    name: `${animeSeasonLabel(season)} ${year}`,
    path: `/api/animes/seasonal?year=${year}&season=${season}`,
  };
}
