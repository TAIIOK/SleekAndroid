const TMDB_GENRE_BY_ID: Record<number, string> = {
  28: 'Боевик',
  12: 'Приключения',
  16: 'Мультфильм',
  35: 'Комедия',
  80: 'Криминал',
  99: 'Документальный',
  18: 'Драма',
  10751: 'Семейный',
  14: 'Фэнтези',
  36: 'История',
  27: 'Ужасы',
  10402: 'Музыка',
  9648: 'Детектив',
  10749: 'Мелодрама',
  878: 'Фантастика',
  10770: 'Телефильм',
  53: 'Триллер',
  10752: 'Военный',
  37: 'Вестерн',
  10759: 'Боевик и приключения',
  10762: 'Детский',
  10763: 'Новости',
  10764: 'Реалити',
  10765: 'Фантастика и фэнтези',
  10766: 'Мыльная опера',
  10767: 'Ток-шоу',
  10768: 'Военный и политика',
};

const TMDB_GENRE_BY_NAME: Record<string, string> = {
  action: 'Боевик',
  adventure: 'Приключения',
  animation: 'Мультфильм',
  comedy: 'Комедия',
  crime: 'Криминал',
  documentary: 'Документальный',
  drama: 'Драма',
  family: 'Семейный',
  fantasy: 'Фэнтези',
  history: 'История',
  horror: 'Ужасы',
  music: 'Музыка',
  mystery: 'Детектив',
  romance: 'Мелодрама',
  'science fiction': 'Фантастика',
  'sci-fi': 'Фантастика',
  'tv movie': 'Телефильм',
  thriller: 'Триллер',
  war: 'Военный',
  western: 'Вестерн',
  'action & adventure': 'Боевик и приключения',
  kids: 'Детский',
  news: 'Новости',
  reality: 'Реалити',
  'sci-fi & fantasy': 'Фантастика и фэнтези',
  soap: 'Мыльная опера',
  talk: 'Ток-шоу',
  'war & politics': 'Военный и политика',
  anime: 'Аниме',
};

const TMDB_STATUS_EXACT: Record<string, string> = {
  Released: 'Выпущено',
  'Returning Series': 'Серии выходят',
  Ended: 'Вышел',
  'In Production': 'В производстве',
  'Post Production': 'Пост-продакшн',
  Planned: 'Запланировано',
  Canceled: 'Отменён',
  Cancelled: 'Отменён',
  Rumored: 'Слухи',
  'On Hiatus': 'На паузе',
};

function normalizeLookupKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function hasCyrillic(value: string): boolean {
  return /[а-яё]/i.test(value);
}

export function formatRuDate(raw?: string | null): string | undefined {
  if (!raw?.trim()) return undefined;
  const trimmed = raw.trim();
  const dateOnly = trimmed.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
  if (match) {
    const [, year, month, day] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (Number.isNaN(date.getTime())) return trimmed;
    return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' }).format(date);
  }
  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' }).format(new Date(parsed));
  }
  return trimmed;
}

export function localizedTmdbStatus(status?: string | null): string | undefined {
  if (!status?.trim()) return undefined;
  const trimmed = status.trim();
  if (TMDB_STATUS_EXACT[trimmed]) return TMDB_STATUS_EXACT[trimmed];
  const normalized = normalizeLookupKey(trimmed);
  const byNormalized = Object.entries(TMDB_STATUS_EXACT).find(
    ([key]) => normalizeLookupKey(key) === normalized,
  );
  if (byNormalized) return byNormalized[1];
  if (normalized.includes('return') && normalized.includes('series')) return 'Серии выходят';
  if (normalized.includes('production') && !normalized.includes('post')) return 'В производстве';
  if (normalized.includes('post production')) return 'Пост-продакшн';
  if (normalized === 'released' || normalized.includes('release')) return 'Выпущено';
  if (normalized === 'ended' || normalized.includes('ended')) return 'Вышел';
  if (normalized.includes('cancel')) return 'Отменён';
  if (normalized.includes('planned')) return 'Запланировано';
  if (normalized.includes('rumor')) return 'Слухи';
  if (normalized.includes('hiatus')) return 'На паузе';
  return trimmed;
}

export function localizedTmdbGenre(name?: string | null, id?: number): string | undefined {
  if (id != null && TMDB_GENRE_BY_ID[id]) return TMDB_GENRE_BY_ID[id];
  if (!name?.trim()) return undefined;
  const trimmed = name.trim();
  if (hasCyrillic(trimmed)) return trimmed;
  return TMDB_GENRE_BY_NAME[normalizeLookupKey(trimmed)] ?? trimmed;
}

export function localizedTmdbGenres(
  genres?: Array<string | { name?: string; id?: number }>,
): string[] {
  if (!genres?.length) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const genre of genres) {
    const rawName = typeof genre === 'string' ? genre : genre.name;
    const id = typeof genre === 'object' ? genre.id : undefined;
    const localized = localizedTmdbGenre(rawName, id);
    if (!localized) continue;
    const key = localized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(localized);
  }
  return result;
}
