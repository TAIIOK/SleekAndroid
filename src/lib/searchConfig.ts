export type SearchMediaFilter = 'all' | 'anime' | 'movie' | 'tv';

export const SEARCH_POPULAR_QUERIES = [
  'Дюна: Часть вторая',
  'Оппенгеймер',
  'Сёгун',
  'Задача трёх тел',
  'Бедные-несчастные',
  'Интерстеллар',
  'Бегущий по лезвию',
  'Атака титанов',
] as const;

export function searchTypeForMediaFilter(filter: SearchMediaFilter): string | undefined {
  if (filter === 'anime') return 'anime';
  if (filter === 'movie' || filter === 'tv') return 'lampa';
  return undefined;
}

export function lampaKindForMediaFilter(filter: SearchMediaFilter): string | undefined {
  if (filter === 'movie') return 'movie';
  if (filter === 'tv') return 'tv';
  return undefined;
}

export type SearchSeeAllBucket = 'anime' | 'lampa';

export function mediaForSearchBucket(
  bucket: SearchSeeAllBucket,
  kind: string | null,
): SearchMediaFilter {
  if (bucket === 'anime') return 'anime';
  return kind === 'tv' ? 'tv' : 'movie';
}
