export type SearchMediaFilter = 'all' | 'anime' | 'movie' | 'tv';

export type SearchSeeAllBucket = 'anime' | 'lampa';

export interface SearchFilterState {
  genre: string;
  year: string;
  status: string;
  animeType: string;
  season: string;
  ageRating: string;
  ratingMin: string;
  lampaGenre: string;
  lampaStatus: string;
  lampaMinRating: string;
  lampaLang: string;
  lampaCountry: string;
  sortBy: string;
  order: string;
}

export const EMPTY_SEARCH_FILTERS: SearchFilterState = {
  genre: '',
  year: '',
  status: '',
  animeType: '',
  season: '',
  ageRating: '',
  ratingMin: '',
  lampaGenre: '',
  lampaStatus: '',
  lampaMinRating: '',
  lampaLang: '',
  lampaCountry: '',
  sortBy: '',
  order: 'desc',
};

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

export const SEARCH_ANIME_STATUS_OPTIONS = [
  { value: '', label: 'Любой статус' },
  { value: 'ongoing', label: 'Онгоинг' },
  { value: 'finished', label: 'Вышел' },
  { value: 'announced', label: 'Анонс' },
] as const;

export const SEARCH_ANIME_TYPE_OPTIONS = [
  { value: '', label: 'Любой тип' },
  { value: 'tv', label: 'TV' },
  { value: 'movie', label: 'Movie' },
  { value: 'ova', label: 'OVA' },
  { value: 'ona', label: 'ONA' },
  { value: 'special', label: 'Special' },
] as const;

export const SEARCH_SEASON_OPTIONS = [
  { value: '', label: 'Любой сезон' },
  { value: '1', label: 'Зима' },
  { value: '2', label: 'Весна' },
  { value: '3', label: 'Лето' },
  { value: '4', label: 'Осень' },
] as const;

export const SEARCH_AGE_RATING_OPTIONS = [
  { value: '', label: 'Любой возраст' },
  { value: '0+', label: '0+' },
  { value: '6+', label: '6+' },
  { value: '12+', label: '12+' },
  { value: '16+', label: '16+' },
  { value: '18+', label: '18+' },
] as const;

export const SEARCH_RATING_MIN_OPTIONS = [
  { value: '', label: 'Любой рейтинг' },
  { value: '5', label: 'от 5' },
  { value: '6', label: 'от 6' },
  { value: '7', label: 'от 7' },
  { value: '8', label: 'от 8' },
  { value: '9', label: 'от 9' },
] as const;

export const SEARCH_LAMPA_STATUS_OPTIONS = [
  { value: '', label: 'Любой статус' },
  { value: 'Released', label: 'Released' },
  { value: 'Returning Series', label: 'Returning Series' },
  { value: 'Ended', label: 'Ended' },
  { value: 'Canceled', label: 'Canceled' },
  { value: 'In Production', label: 'In Production' },
  { value: 'Planned', label: 'Planned' },
] as const;

export const SEARCH_LANG_OPTIONS = [
  { value: '', label: 'Любой язык' },
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'zh', label: '中文' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
] as const;

export const SEARCH_COUNTRY_OPTIONS = [
  { value: '', label: 'Любая страна' },
  { value: 'RU', label: 'Россия' },
  { value: 'US', label: 'США' },
  { value: 'JP', label: 'Япония' },
  { value: 'KR', label: 'Корея' },
  { value: 'GB', label: 'Великобритания' },
  { value: 'FR', label: 'Франция' },
  { value: 'DE', label: 'Германия' },
  { value: 'CN', label: 'Китай' },
] as const;

export const SEARCH_SORT_OPTIONS = [
  { value: '', label: 'По умолчанию' },
  { value: 'year', label: 'Год' },
  { value: 'title', label: 'Название' },
  { value: 'updatedAt', label: 'Обновлено' },
  { value: 'ratings', label: 'Рейтинг' },
  { value: 'vote_average', label: 'Рейтинг (фильмы)' },
  { value: 'popularity', label: 'Популярность' },
  { value: 'relevance', label: 'Релевантность' },
] as const;

export const SEARCH_ORDER_OPTIONS = [
  { value: 'desc', label: 'По убыванию' },
  { value: 'asc', label: 'По возрастанию' },
] as const;

export function searchYearOptions(
  fromYear = 2026,
  count = 37,
): Array<{ value: string; label: string }> {
  return [
    { value: '', label: 'Любой год' },
    ...Array.from({ length: count }, (_, i) => {
      const y = String(fromYear - i);
      return { value: y, label: y };
    }),
  ];
}

/** @deprecated use searchYearOptions — kept for older call sites */
export const SEARCH_YEAR_OPTIONS = Array.from({ length: 37 }, (_, i) => String(2026 - i));

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

export function usesAnimeFilters(filter: SearchMediaFilter): boolean {
  return filter === 'all' || filter === 'anime';
}

export function usesLampaFilters(filter: SearchMediaFilter): boolean {
  return filter === 'all' || filter === 'movie' || filter === 'tv';
}

export function hasActiveSearchFilters(
  media: SearchMediaFilter,
  filters: SearchFilterState,
): boolean {
  const year = Boolean(filters.year);
  if (usesAnimeFilters(media)) {
    if (
      filters.genre ||
      year ||
      filters.status ||
      filters.animeType ||
      filters.season ||
      filters.ageRating ||
      filters.ratingMin
    ) {
      return true;
    }
  }
  if (usesLampaFilters(media)) {
    if (
      filters.lampaGenre ||
      year ||
      filters.lampaStatus ||
      filters.lampaMinRating ||
      filters.lampaLang ||
      filters.lampaCountry
    ) {
      return true;
    }
  }
  if (filters.sortBy) return true;
  return false;
}

export function canRunCatalogSearch(
  q: string,
  media: SearchMediaFilter,
  filters: SearchFilterState,
): boolean {
  return q.trim().length >= 2 || hasActiveSearchFilters(media, filters);
}

/** Clear filters that no longer apply after media type change. */
export function pruneFiltersForMedia(
  media: SearchMediaFilter,
  filters: SearchFilterState,
): SearchFilterState {
  const next = { ...filters };
  if (!usesAnimeFilters(media)) {
    next.genre = '';
    next.status = '';
    next.animeType = '';
    next.season = '';
    next.ageRating = '';
    next.ratingMin = '';
  }
  if (!usesLampaFilters(media)) {
    next.lampaGenre = '';
    next.lampaStatus = '';
    next.lampaMinRating = '';
    next.lampaLang = '';
    next.lampaCountry = '';
  }
  if (media === 'anime') {
    next.lampaGenre = '';
    next.lampaStatus = '';
    next.lampaMinRating = '';
    next.lampaLang = '';
    next.lampaCountry = '';
  }
  if (media === 'movie' || media === 'tv') {
    next.genre = '';
    next.status = '';
    next.animeType = '';
    next.season = '';
    next.ageRating = '';
    next.ratingMin = '';
  }
  return next;
}

export function mediaForSearchBucket(
  bucket: SearchSeeAllBucket,
  kind: string | null,
): SearchMediaFilter {
  if (bucket === 'anime') return 'anime';
  return kind === 'tv' ? 'tv' : 'movie';
}

/** Drop duplicate catalog rows so rail/list keys stay unique. */
export function uniqueById<T extends { id: string | number }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = String(item.id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** Build `/api/catalog/search` filter fields from media + filter state. */
export function catalogSearchFilterParams(
  media: SearchMediaFilter,
  filters: SearchFilterState,
): {
  year?: string;
  genre?: string;
  status?: string;
  animeType?: string;
  season?: string;
  ageRating?: string;
  ratingMin?: string;
  lampaKind?: string;
  lampaGenre?: string;
  lampaStatus?: string;
  lampaMinRating?: string;
  lampaLang?: string;
  lampaCountry?: string;
  sortBy?: string;
  order?: string;
} {
  const animeOn = usesAnimeFilters(media);
  const lampaOn = usesLampaFilters(media);
  return {
    year: filters.year || undefined,
    genre: animeOn ? filters.genre || undefined : undefined,
    status: animeOn ? filters.status || undefined : undefined,
    animeType: animeOn ? filters.animeType || undefined : undefined,
    season: animeOn ? filters.season || undefined : undefined,
    ageRating: animeOn ? filters.ageRating || undefined : undefined,
    ratingMin: animeOn ? filters.ratingMin || undefined : undefined,
    lampaKind: lampaKindForMediaFilter(media),
    lampaGenre: lampaOn ? filters.lampaGenre || undefined : undefined,
    lampaStatus: lampaOn ? filters.lampaStatus || undefined : undefined,
    lampaMinRating: lampaOn ? filters.lampaMinRating || undefined : undefined,
    lampaLang: lampaOn ? filters.lampaLang || undefined : undefined,
    lampaCountry: lampaOn ? filters.lampaCountry || undefined : undefined,
    sortBy: filters.sortBy || undefined,
    order: filters.sortBy ? filters.order || 'desc' : undefined,
  };
}

export function summarizeSearchFilters(
  media: SearchMediaFilter,
  filters: SearchFilterState,
  genres: Array<{ id: number | string; name: string }> = [],
  lampaGenres: Array<{ id: number | string; name: string }> = [],
): string {
  const parts: string[] = [];
  if (media === 'anime') parts.push('Аниме');
  if (media === 'movie') parts.push('Фильмы');
  if (media === 'tv') parts.push('Сериалы');
  if (filters.year) parts.push(filters.year);
  if (filters.genre) {
    const name = genres.find((g) => String(g.id) === filters.genre)?.name;
    if (name) parts.push(name);
  }
  if (filters.lampaGenre) {
    const name = lampaGenres.find((g) => String(g.id) === filters.lampaGenre)?.name;
    if (name) parts.push(name);
  }
  if (filters.status) {
    const opt = SEARCH_ANIME_STATUS_OPTIONS.find((o) => o.value === filters.status);
    if (opt?.label) parts.push(opt.label);
  }
  if (filters.sortBy) {
    const opt = SEARCH_SORT_OPTIONS.find((o) => o.value === filters.sortBy);
    if (opt?.label) parts.push(opt.label);
  }
  return parts.slice(0, 3).join(' · ');
}
