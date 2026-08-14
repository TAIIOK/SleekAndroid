import {
  EMPTY_SEARCH_FILTERS,
  type SearchFilterState,
  type SearchMediaFilter,
} from '@/lib/searchConfig';

export type SearchSessionItem = {
  id: string | number;
  title: string;
  poster?: string | null;
  subtitle?: string;
  score?: number | null;
  animeId?: number;
  kind?: string;
};

export type SearchSessionSnapshot = {
  query: string;
  media: SearchMediaFilter;
  filters: SearchFilterState;
  animeItems: SearchSessionItem[];
  lampaItems: SearchSessionItem[];
  hasSearched: boolean;
  error: string | null;
  scrollY: number;
};

let session: SearchSessionSnapshot | null = null;

export function getSearchSession(): SearchSessionSnapshot | null {
  return session;
}

export function saveSearchSession(next: SearchSessionSnapshot): void {
  session = next;
}

export function patchSearchSession(patch: Partial<SearchSessionSnapshot>): void {
  if (!session) {
    session = {
      query: '',
      media: 'all',
      filters: { ...EMPTY_SEARCH_FILTERS },
      animeItems: [],
      lampaItems: [],
      hasSearched: false,
      error: null,
      scrollY: 0,
      ...patch,
    };
    return;
  }
  session = { ...session, ...patch };
}

export function clearSearchSession(): void {
  session = null;
}
