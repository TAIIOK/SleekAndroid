import type { LampaPersonCredit, LampaPersonDetail } from '@/api/lampaPerson';
import { formatRuDate, localizedTmdbGenre } from '@/lib/catalogLocalization';
import { lampaTitle } from '@/lib/lampaDetail';

const DEPARTMENT_LABELS: Record<string, string> = {
  Acting: 'АКТЁР',
  Directing: 'РЕЖИССЁР',
  Sound: 'МУЗЫКАНТ',
  Writing: 'СЦЕНАРИСТ',
  Production: 'ПРОДЮСЕР',
  Camera: 'ОПЕРАТОР',
  Editing: 'МОНТАЖ',
  Art: 'ХУДОЖНИК',
  'Costume & Make-Up': 'КОСТЮМЫ',
  Crew: 'СЪЁМОЧНАЯ ГРУППА',
};

export function localizePersonDepartment(department?: string | null): string | undefined {
  if (!department?.trim()) return undefined;
  const trimmed = department.trim();
  return DEPARTMENT_LABELS[trimmed] ?? trimmed.toUpperCase();
}

export function pickPersonEnglishName(name: string, alsoKnownAs?: unknown): string | undefined {
  if (!Array.isArray(alsoKnownAs)) return undefined;
  const aliases = alsoKnownAs
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim());

  const latinAlias = aliases.find(
    (alias) => alias !== name && /^[\x00-\x7F]+$/.test(alias) && /[A-Za-z]/.test(alias),
  );
  if (latinAlias) return latinAlias;
  return aliases.find((alias) => alias !== name);
}

export function parsePersonDepartments(
  person: Pick<LampaPersonDetail, 'knownForDepartment'> | null | undefined,
): string[] {
  const label = localizePersonDepartment(person?.knownForDepartment);
  return label ? [label] : [];
}

export function formatPersonBirthdayWithAge(
  birthday?: string,
  deathday?: string,
): string | undefined {
  const formattedBirthday = formatRuDate(birthday);
  if (!formattedBirthday) return undefined;

  if (deathday) {
    const formattedDeath = formatRuDate(deathday);
    return formattedDeath ? `${formattedBirthday} — ${formattedDeath}` : formattedBirthday;
  }

  const birthDate = parseIsoDate(birthday);
  if (!birthDate) return formattedBirthday;

  const age = calculateAge(birthDate, new Date());
  if (age == null) return formattedBirthday;
  return `${formattedBirthday} (${age} ${pluralYears(age)})`;
}

export function creditReleaseDate(item: LampaPersonCredit): string {
  return item.release_date ?? item.releaseDate ?? item.first_air_date ?? item.firstAirDate ?? '';
}

export function creditYear(item: LampaPersonCredit): number | null {
  const raw = creditReleaseDate(item);
  if (!raw) return null;
  const year = Number(raw.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

export function isCreditInProduction(item: LampaPersonCredit): boolean {
  const raw = creditReleaseDate(item);
  if (!raw) return false;
  const release = parseIsoDate(raw);
  if (!release) return false;
  return release.getTime() > Date.now();
}

export function formatCreditMeta(item: LampaPersonCredit): string | undefined {
  const year = creditYear(item);
  const genre =
    item.genreIds
      ?.map((genreId) => localizedTmdbGenre(undefined, genreId))
      .find(Boolean) ?? undefined;

  if (year && genre) return `${year} • ${genre}`;
  if (year) return String(year);
  return genre;
}

export function pickTopPersonCredits(items: LampaPersonCredit[], limit = 8): LampaPersonCredit[] {
  return [...items]
    .filter((item) => (item.vote_average ?? item.voteAverage ?? 0) > 0)
    .sort(
      (a, b) =>
        (b.vote_average ?? b.voteAverage ?? 0) - (a.vote_average ?? a.voteAverage ?? 0),
    )
    .slice(0, limit);
}

export function formatCreditRating(item: LampaPersonCredit): string | undefined {
  const value = item.vote_average ?? item.voteAverage;
  if (value == null || value <= 0) return undefined;
  return value.toFixed(1);
}

export function personProjectLabel(item: LampaPersonCredit): string {
  return lampaTitle(item);
}

export function personCreditKey(item: LampaPersonCredit): string {
  const kind = item.mediaType ?? item.kind ?? 'movie';
  return `${kind}-${item.id}-${item.creditId ?? item.character ?? ''}`;
}

export function pluralProjects(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'проект';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'проекта';
  return 'проектов';
}

function parseIsoDate(raw?: string): Date | null {
  if (!raw) return null;
  const date = new Date(`${raw}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function calculateAge(birthDate: Date, onDate: Date): number | null {
  let age = onDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = onDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && onDate.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

function pluralYears(age: number): string {
  const mod10 = age % 10;
  const mod100 = age % 100;
  if (mod10 === 1 && mod100 !== 11) return 'год';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'года';
  return 'лет';
}
