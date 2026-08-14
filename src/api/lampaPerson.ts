import type { LampaItem } from '@/api/catalog';
import { mapTmdbMediaToLampaItem } from '@/api/lampaExtras';
import { watchHubUrl } from '@/lib/config';
import {
  parsePersonDepartments,
  pickPersonEnglishName,
} from '@/lib/lampaPersonUtils';

export interface LampaPersonDetail {
  id: number;
  name: string;
  biography?: string;
  birthday?: string;
  deathday?: string;
  placeOfBirth?: string;
  profilePath?: string;
  knownForDepartment?: string;
  englishName?: string;
  homepage?: string;
  imdbId?: string;
  departments?: string[];
}

export type LampaPersonCredit = LampaItem & {
  kind?: 'movie' | 'tv';
  mediaType?: 'movie' | 'tv';
  character?: string;
  creditId?: string;
  genreIds?: number[];
  release_date?: string;
  releaseDate?: string;
  first_air_date?: string;
  firstAirDate?: string;
  vote_average?: number;
  voteAverage?: number;
};

export interface LampaPersonCreditsPage {
  items: LampaPersonCredit[];
  page: number;
  totalPages: number;
  totalItems: number;
}

const CREDITS_PAGE_SIZE = 20;

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function creditDate(item: LampaPersonCredit): string {
  return item.release_date ?? item.releaseDate ?? item.first_air_date ?? item.firstAirDate ?? '';
}

export function parseLampaPersonDetail(raw: unknown): LampaPersonDetail | null {
  if (!raw || typeof raw !== 'object') return null;
  const person = raw as Record<string, unknown>;
  const id = Number(person.id);
  const name = typeof person.name === 'string' ? person.name.trim() : '';
  if (!Number.isFinite(id) || !name) return null;

  const knownForDepartment = pickString(person.known_for_department);

  return {
    id,
    name,
    biography: pickString(person.biography),
    birthday: pickString(person.birthday),
    deathday: pickString(person.deathday),
    placeOfBirth: pickString(person.place_of_birth),
    profilePath: pickString(person.profile_path),
    knownForDepartment,
    englishName: pickPersonEnglishName(name, person.also_known_as),
    homepage: pickString(person.homepage),
    imdbId: pickString(person.imdb_id),
    departments: parsePersonDepartments({ knownForDepartment }),
  };
}

export function parsePersonCastCredits(raw: unknown): LampaPersonCredit[] {
  if (!raw || typeof raw !== 'object') return [];
  const payload = raw as { cast?: unknown; results?: unknown };
  const cast = Array.isArray(payload.cast)
    ? payload.cast
    : Array.isArray(payload.results)
      ? payload.results
      : [];
  if (!cast.length) return [];

  const seen = new Set<string>();
  const items: LampaPersonCredit[] = [];

  for (const entry of cast) {
    if (!entry || typeof entry !== 'object') continue;
    const credit = entry as Record<string, unknown>;
    const mediaType = credit.media_type === 'tv' ? 'tv' : 'movie';
    const mapped = mapTmdbMediaToLampaItem(credit, mediaType);
    if (!mapped?.id) continue;

    const key = `${mediaType}-${mapped.id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const genreIds = Array.isArray(credit.genre_ids)
      ? credit.genre_ids.filter((value): value is number => typeof value === 'number')
      : undefined;

    items.push({
      ...mapped,
      kind: mediaType,
      mediaType,
      character:
        typeof credit.character === 'string' && credit.character.trim()
          ? credit.character.trim()
          : undefined,
      creditId:
        typeof credit.credit_id === 'string' && credit.credit_id.trim()
          ? credit.credit_id.trim()
          : undefined,
      genreIds: genreIds?.length ? genreIds : undefined,
      release_date: typeof credit.release_date === 'string' ? credit.release_date : undefined,
      first_air_date: typeof credit.first_air_date === 'string' ? credit.first_air_date : undefined,
      vote_average: typeof credit.vote_average === 'number' ? credit.vote_average : undefined,
    });
  }

  items.sort((a, b) => creditDate(b).localeCompare(creditDate(a)));
  return items;
}

export function paginatePersonCredits(
  items: LampaPersonCredit[],
  page: number,
  pageSize = CREDITS_PAGE_SIZE,
): LampaPersonCreditsPage {
  const safePage = Math.max(1, page);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    totalItems: items.length,
  };
}

let combinedCreditsCache = new Map<number, LampaPersonCredit[]>();

export function clearLampaPersonCreditsCache(): void {
  combinedCreditsCache = new Map();
}

async function loadPersonCastCredits(personId: number): Promise<LampaPersonCredit[]> {
  const cached = combinedCreditsCache.get(personId);
  if (cached) return cached;

  const res = await fetch(
    watchHubUrl(`/api/tmdb/person/${personId}/combined_credits?page=1`),
    { headers: { 'accept-language': 'ru' } },
  );
  if (!res.ok) return [];
  const json = (await res.json()) as unknown;
  const items = parsePersonCastCredits(json);
  combinedCreditsCache.set(personId, items);
  return items;
}

export async function fetchLampaPerson(personId: number): Promise<LampaPersonDetail | null> {
  if (!Number.isFinite(personId) || personId <= 0) return null;

  try {
    const res = await fetch(watchHubUrl(`/api/tmdb/person/${personId}`), {
      headers: { 'accept-language': 'ru' },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as unknown;
    return parseLampaPersonDetail(json);
  } catch {
    return null;
  }
}

export async function fetchLampaPersonCredits(
  personId: number,
  page: number,
): Promise<LampaPersonCreditsPage> {
  if (!Number.isFinite(personId) || personId <= 0) {
    return { items: [], page: 1, totalPages: 1, totalItems: 0 };
  }

  try {
    const allItems = await loadPersonCastCredits(personId);
    return paginatePersonCredits(allItems, page);
  } catch {
    return { items: [], page: 1, totalPages: 1, totalItems: 0 };
  }
}
