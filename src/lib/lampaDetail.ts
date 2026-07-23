import type { LampaDetail, LampaSeason } from '@/api/catalog';
import {
  formatRuDate,
  localizedTmdbGenre,
  localizedTmdbGenres,
  localizedTmdbStatus,
} from '@/lib/catalogLocalization';
import { resolveLampaPosterUrl } from '@/lib/config';
import { extractPosterPath } from '@/lib/poster';

export interface LampaDetailPayload {
  detail: LampaDetail;
  isSaved: boolean;
}

export function lampaProgressKey(season: number, episode: number): string {
  return `${season}-${episode}`;
}

export function lampaDetailRouteId(item: {
  id?: string | number;
  rawId?: string | number;
  tmdbId?: string | number;
  objectId?: string;
}): string {
  const numeric = item.id ?? item.rawId;
  if (numeric != null && /^\d+$/.test(String(numeric))) return String(numeric);
  if (item.tmdbId != null && Number(item.tmdbId) > 0) return String(item.tmdbId);
  return '';
}

export function lampaDetailPath(
  kind: string,
  item: {
    id?: string | number;
    rawId?: string | number;
    tmdbId?: string | number;
    objectId?: string;
  },
): string {
  const id = lampaDetailRouteId(item);
  const normalizedKind = kind === 'home' ? 'tv' : kind;
  if (normalizedKind === 'movie') return `/movies/${id}`;
  if (normalizedKind === 'tv') return `/series/${id}`;
  return `/lampa/${normalizedKind}/${id}`;
}

export function lampaTitle(item: Record<string, unknown> | LampaDetail): string {
  const record = item as Record<string, unknown>;
  for (const key of ['title', 'name', 'originalTitle', 'original_title']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return 'Без названия';
}

export function isLampaSerial(kind?: string): boolean {
  return kind === 'tv' || kind === 'home';
}

export function lampaKindLabel(kind?: string): string {
  if (!kind) return 'Контент';
  if (kind === 'movie') return 'Фильм';
  if (kind === 'tv' || kind === 'home') return 'Сериал';
  return kind;
}

export function lampaBackdropPath(item: LampaDetail): string | undefined {
  const raw =
    item.backdropPath ??
    item.backdrop_path ??
    item.posterPath ??
    item.poster_path ??
    item.poster;
  return typeof raw === 'string' && raw.trim()
    ? raw.trim()
    : extractPosterPath(raw);
}

export function lampaBackdrop(
  item: LampaDetail,
  size: 'w780' | 'w500' = 'w780',
): string | undefined {
  return resolveLampaPosterUrl(lampaBackdropPath(item), size);
}

export function lampaYear(item: LampaDetail): number | undefined {
  if (typeof item.year === 'number' && Number.isFinite(item.year)) return item.year;
  const raw =
    item.releaseDate ?? item.release_date ?? item.first_air_date ?? item.firstAirDate;
  if (!raw) return undefined;
  const year = parseInt(String(raw).slice(0, 4), 10);
  return Number.isFinite(year) ? year : undefined;
}

export function lampaRating(item: LampaDetail): number | undefined {
  const score = item.voteAverage ?? item.vote_average;
  if (score == null || score <= 0) return undefined;
  return score > 10 ? score / 10 : score;
}

export function lampaAltTitle(detail: LampaDetail): string | undefined {
  const title = lampaTitle(detail);
  const alt =
    detail.originalTitle ??
    detail.original_title ??
    detail.originalName ??
    detail.original_name;
  if (!alt?.trim() || alt.trim() === title.trim()) return undefined;
  return alt.trim();
}

export function lampaRuntime(item: LampaDetail): string | undefined {
  const runtime = item.runtime ?? item.pg;
  if (runtime == null || runtime <= 0) return undefined;
  if (item.kind === 'movie' || !item.kind) return `${runtime} мин`;
  return undefined;
}

export function lampaStatus(detail: LampaDetail): string | undefined {
  const raw = detail.status;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

export function localizedLampaStatus(status?: string): string | undefined {
  return localizedTmdbStatus(status);
}

export function lampaGenreNames(genres?: LampaDetail['genres']): string[] {
  return localizedTmdbGenres(genres);
}

export function parseLampaSeasons(seasons: unknown): LampaSeason[] {
  if (Array.isArray(seasons)) {
    return seasons.map((entry, index) => {
      if (entry && typeof entry === 'object') {
        const s = entry as LampaSeason & Record<string, unknown>;
        const seasonNumber = Number(s.seasonNumber ?? s.season_number ?? index + 1);
        return {
          seasonNumber: Number.isFinite(seasonNumber) ? seasonNumber : index + 1,
          episodeCount: s.episodeCount ?? (s.episode_count as number | undefined),
          name: typeof s.name === 'string' ? s.name : undefined,
          overview: typeof s.overview === 'string' ? s.overview : undefined,
          air_date:
            typeof s.air_date === 'string'
              ? s.air_date
              : typeof s.airDate === 'string'
                ? s.airDate
                : undefined,
          airDate:
            typeof s.air_date === 'string'
              ? s.air_date
              : typeof s.airDate === 'string'
                ? s.airDate
                : undefined,
          poster_path:
            typeof s.poster_path === 'string'
              ? s.poster_path
              : typeof s.posterPath === 'string'
                ? s.posterPath
                : undefined,
          posterPath:
            typeof s.poster_path === 'string'
              ? s.poster_path
              : typeof s.posterPath === 'string'
                ? s.posterPath
                : undefined,
        };
      }
      return { seasonNumber: index + 1 };
    });
  }

  if (seasons && typeof seasons === 'object') {
    return Object.entries(seasons as Record<string, number>)
      .map(([num, count]) => {
        const seasonNumber = parseInt(num, 10);
        return {
          seasonNumber: Number.isFinite(seasonNumber) ? seasonNumber : undefined,
          episodeCount: count,
          name: Number.isFinite(seasonNumber) ? `Сезон ${seasonNumber}` : `Сезон ${num}`,
        };
      })
      .sort((a, b) => (a.seasonNumber ?? 0) - (b.seasonNumber ?? 0));
  }

  return [];
}

export function resolveLampaTmdbId(
  detail: Pick<LampaDetail, 'tmdbId' | 'id'> | undefined,
  routeId: string,
): number | undefined {
  const fromDetail = detail?.tmdbId ?? detail?.id;
  if (fromDetail != null) {
    const numeric = Number(fromDetail);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
  }
  const fromRoute = Number(routeId);
  if (Number.isFinite(fromRoute) && fromRoute > 0) return fromRoute;
  return undefined;
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function pickNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function tmdbGenres(raw: unknown): Array<string | { name?: string; id?: number }> {
  if (!Array.isArray(raw)) return [];
  return localizedTmdbGenres(
    raw.map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry === 'object' && 'name' in entry) {
        const obj = entry as { name?: string; id?: number };
        return { name: obj.name, id: obj.id };
      }
      return '';
    }),
  );
}

export function decodeLampaDetail(raw: unknown): LampaDetailPayload {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid lampa detail response');
  }

  const envelope = raw as Record<string, unknown>;
  if (envelope.item && typeof envelope.item === 'object') {
    const item = envelope.item as LampaDetail;
    const genresRaw = envelope.genres;
    const genres = Array.isArray(genresRaw)
      ? genresRaw
          .map((g) => {
            if (typeof g === 'string') return localizedTmdbGenre(g);
            if (g && typeof g === 'object' && 'name' in g) {
              const obj = g as { name?: string; id?: number };
              return localizedTmdbGenre(obj.name, obj.id);
            }
            return undefined;
          })
          .filter((g): g is string => !!g)
      : lampaGenreNames(item.genres);

    return {
      detail: {
        ...item,
        genres,
        seasons: parseLampaSeasons(item.seasons),
        description: item.description ?? item.overview,
        overview: item.overview ?? item.description,
      },
      isSaved: Boolean(envelope.isSaved),
    };
  }

  const flat = raw as LampaDetail;
  return {
    detail: {
      ...flat,
      seasons: parseLampaSeasons(flat.seasons),
      description: flat.description ?? flat.overview,
      overview: flat.overview ?? flat.description,
    },
    isSaved: false,
  };
}

/** Merge TMDB ru detail (WatchHub) over backend payload. */
export function mergeLampaWithTmdb(
  backend: LampaDetailPayload | null,
  tmdb: Record<string, unknown>,
  kind: string,
): LampaDetailPayload {
  const base = backend?.detail ?? ({ kind } as LampaDetail);
  const genres = tmdbGenres(tmdb.genres);
  const overview = pickString(tmdb.overview, base.overview, base.description);

  return {
    isSaved: backend?.isSaved ?? false,
    detail: {
      ...base,
      kind: kind || base.kind,
      id: base.id ?? pickNumber(tmdb.id),
      tmdbId: base.tmdbId ?? pickNumber(tmdb.id),
      title: pickString(tmdb.title, base.title),
      name: pickString(tmdb.name, base.name),
      original_title: pickString(tmdb.original_title, base.original_title),
      originalTitle: pickString(tmdb.original_title, base.originalTitle),
      original_name: pickString(tmdb.original_name, base.original_name),
      originalName: pickString(tmdb.original_name, base.originalName),
      overview,
      description: overview,
      poster_path: pickString(tmdb.poster_path, base.poster_path),
      posterPath: pickString(tmdb.poster_path, base.posterPath),
      backdrop_path: pickString(tmdb.backdrop_path, base.backdrop_path),
      backdropPath: pickString(tmdb.backdrop_path, base.backdropPath),
      release_date: pickString(tmdb.release_date, base.release_date),
      releaseDate: pickString(tmdb.release_date, base.releaseDate),
      first_air_date: pickString(tmdb.first_air_date, base.first_air_date),
      firstAirDate: pickString(tmdb.first_air_date, base.firstAirDate),
      status: pickString(tmdb.status, base.status),
      vote_average: pickNumber(tmdb.vote_average, base.vote_average),
      voteAverage: pickNumber(tmdb.vote_average, base.voteAverage),
      runtime: pickNumber(tmdb.runtime, base.runtime, base.pg),
      pg: pickNumber(tmdb.runtime, base.pg),
      genres: genres.length ? genres : base.genres,
      seasons: tmdb.seasons ? parseLampaSeasons(tmdb.seasons) : parseLampaSeasons(base.seasons),
    },
  };
}

export interface LampaInfoRow {
  title: string;
  value: string;
}

/** Meta rows for hero (genres shown as chips elsewhere). */
export function buildLampaHeroInfoRows(
  detail: LampaDetail,
  isSerial: boolean,
): LampaInfoRow[] {
  return buildLampaInfoRows(detail, isSerial).filter((row) => row.title !== 'Жанры');
}

export function buildLampaInfoRows(detail: LampaDetail, isSerial: boolean): LampaInfoRow[] {
  const rows: LampaInfoRow[] = [{ title: 'Тип', value: lampaKindLabel(detail.kind) }];

  const premiere =
    detail.releaseDate ?? detail.release_date ?? detail.first_air_date ?? detail.firstAirDate;
  const premiereFormatted = formatRuDate(premiere);
  if (premiereFormatted) {
    rows.push({ title: isSerial ? 'Премьера' : 'Дата выхода', value: premiereFormatted });
  }

  const runtime = lampaRuntime(detail);
  if (runtime) rows.push({ title: 'Длительность', value: runtime });

  const status = localizedLampaStatus(lampaStatus(detail));
  if (status) rows.push({ title: 'Статус', value: status });

  const seasons = parseLampaSeasons(detail.seasons);
  if (isSerial && seasons.length) {
    const totalEpisodes = seasons.reduce((sum, s) => sum + (s.episodeCount ?? 0), 0);
    rows.push({
      title: 'Сезоны',
      value: `${seasons.length}${totalEpisodes ? ` · ${totalEpisodes} эп.` : ''}`,
    });
  }

  // Genres are shown as chips in LampaDetailGenres — keep info rows for meta only.

  const original =
    detail.originalTitle ??
    detail.original_title ??
    detail.originalName ??
    detail.original_name;
  if (original && original !== lampaTitle(detail)) {
    rows.push({ title: 'Оригинал', value: original });
  }

  return rows;
}
