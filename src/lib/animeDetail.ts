import type { AnimeEpisode, AnimeListItem, AnimeVideo } from '@aniverse/types';
import { nonEmptyStreamUrl } from '@aniverse/types';
import { normalizeDubbingName } from '@aniverse/playback';

import type { AnimeDetail } from '@/api/catalog';
import { extractPosterPath } from '@/lib/poster';

export function localizedAnimeStatus(status?: string): string {
  if (!status) return '';
  const s = status.toLowerCase();
  if (s.includes('ongo') || s.includes('онго')) return 'Онгоинг';
  if (s.includes('finish') || s.includes('выш') || s.includes('заверш')) return 'Завершён';
  if (s.includes('announc') || s.includes('анонс')) return 'Анонсировано';
  return status;
}

export function animeGenreNames(genres?: AnimeDetail['genres']): string[] {
  if (!genres?.length) return [];
  return genres
    .map((g) => (typeof g === 'string' ? g : g.name))
    .filter((g): g is string => !!g?.trim());
}

export function animeScore(detail: AnimeDetail): number | undefined {
  if (typeof detail.score === 'number' && detail.score > 0) return detail.score;
  const rating = detail.aggregatedRating?.rating;
  if (typeof rating === 'number' && rating > 0) return rating;
  return undefined;
}

export function animeAltTitle(detail: AnimeDetail): string | undefined {
  const alt = detail.alternativeTitle ?? detail.titleEn;
  if (!alt?.trim() || alt.trim() === detail.title?.trim()) return undefined;
  return alt.trim();
}

export function animeStudioName(detail: AnimeDetail): string | undefined {
  const studios = detail.studios;
  if (!studios?.length) return undefined;
  const names = studios
    .map((s) => (typeof s === 'string' ? s : s.name))
    .filter((s): s is string => !!s?.trim());
  return names.length ? names.join(', ') : undefined;
}

export function localizedAnimeType(type?: string): string | undefined {
  if (!type?.trim()) return undefined;
  const value = type.trim().toLowerCase();
  if (value.includes('tv') || value.includes('сериал')) return 'TV SERIES';
  if (value.includes('movie') || value.includes('фильм')) return 'FILM';
  if (value.includes('ova')) return 'OVA';
  if (value.includes('ona')) return 'ONA';
  if (value.includes('special')) return 'SPECIAL';
  return type.trim().toUpperCase();
}

export function animeHeroImageCandidates(detail: AnimeDetail): string[] {
  const candidates: string[] = [];
  const push = (value: unknown) => {
    const path = extractPosterPath(value);
    if (path && !candidates.includes(path)) candidates.push(path);
  };
  push(detail.banner);
  push(detail.screenshots);
  push(detail.poster);
  return candidates;
}

export function episodeNumber(ep: AnimeEpisode): number {
  return ep.ordinal ?? ep.id;
}

export function isRedundantEpisodeTitle(title: string, number: number): boolean {
  const t = title.trim().toLowerCase();
  if (!t) return true;
  if (t === String(number)) return true;
  // "Episode 1", "Эпизод 1", "Ep. 1", "Эп. 1", "1 эпизод", etc.
  const stripped = t
    .replace(/^(эпизод|episode|ep\.?|эп\.?)\s*/i, '')
    .replace(/\s*(эпизод|episode)$/i, '')
    .trim();
  return stripped === String(number);
}

/** API may return screenshot/poster even when shared AnimeEpisode type omits them. */
export function episodeThumbnail(ep: AnimeEpisode): string | undefined {
  const raw = ep as AnimeEpisode & { screenshot?: unknown; poster?: unknown };
  return extractPosterPath(raw.screenshot) ?? extractPosterPath(raw.poster);
}

export function hasPlayableVideo(ep: AnimeEpisode): boolean {
  return (ep.video ?? []).some((v) => !!pickVideoUrl(v));
}

export function pickVideoUrl(video: AnimeVideo): string | undefined {
  return (
    nonEmptyStreamUrl(video.hls1080) ??
    nonEmptyStreamUrl(video.hls720) ??
    nonEmptyStreamUrl(video.hls480) ??
    nonEmptyStreamUrl(video.hls360) ??
    nonEmptyStreamUrl(video.url)
  );
}

export function getUniqueDubbingOptions(videos: AnimeVideo[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const video of videos) {
    const label = normalizeDubbingName(video);
    if (seen.has(label)) continue;
    seen.add(label);
    result.push(label);
  }
  return result;
}

export interface AnimeInfoRow {
  title: string;
  value: string;
}

export function buildAnimeInfoRows(
  detail: AnimeDetail,
  episodesTotal?: number,
): AnimeInfoRow[] {
  const rows: AnimeInfoRow[] = [];

  const typeLabel = localizedAnimeType(detail.type);
  if (typeLabel) rows.push({ title: 'Тип', value: typeLabel });

  const status = detail.status ? localizedAnimeStatus(detail.status) : undefined;
  if (status) rows.push({ title: 'Статус', value: status });

  if (detail.year) rows.push({ title: 'Год', value: String(detail.year) });

  const studio = animeStudioName(detail);
  if (studio) rows.push({ title: 'Студия', value: studio });

  if (detail.ageRating?.trim()) {
    rows.push({ title: 'Возраст', value: detail.ageRating.trim() });
  }

  const score = animeScore(detail);
  if (score != null) rows.push({ title: 'Рейтинг', value: score.toFixed(1) });

  const resolvedEpisodesTotal =
    episodesTotal ??
    (detail.episodesTotal != null && detail.episodesTotal > 0
      ? detail.episodesTotal
      : undefined);
  if (resolvedEpisodesTotal != null) {
    rows.push({ title: 'Эпизоды', value: String(resolvedEpisodesTotal) });
  }

  const genres = animeGenreNames(detail.genres);
  if (genres.length) rows.push({ title: 'Жанры', value: genres.slice(0, 4).join(', ') });

  return rows;
}

/** Meta rows for hero (genres already shown as chips). */
export function buildAnimeHeroInfoRows(
  detail: AnimeDetail,
  episodesTotal?: number,
): AnimeInfoRow[] {
  return buildAnimeInfoRows(detail, episodesTotal).filter((row) => row.title !== 'Жанры');
}

export function isRecommendationRelation(relationType?: string): boolean {
  const n = (relationType ?? '').toLowerCase();
  return n.includes('recommend') || n.includes('рекомен');
}

export interface AnimeRelated {
  id?: number;
  animeId?: number;
  relatedAnimeId?: number;
  relationType?: string;
  title?: string;
  poster?: unknown;
  anime?: AnimeListItem;
  relatedAnime?: AnimeListItem;
}

export function extractRelatedItems(
  related: AnimeRelated[],
  animeId: number,
  recommendations: boolean,
): AnimeListItem[] {
  const seen = new Set<number>();
  const result: AnimeListItem[] = [];

  const pushItem = (item: AnimeListItem | undefined) => {
    if (!item?.id || item.id === animeId || seen.has(item.id)) return;
    seen.add(item.id);
    result.push(item);
  };

  for (const relation of related) {
    const isRec = isRecommendationRelation(relation.relationType);
    if (recommendations !== isRec) continue;
    let item: AnimeListItem | undefined;
    if (relation.relatedAnimeId === animeId) item = relation.anime;
    else if (relation.animeId === animeId) item = relation.relatedAnime;
    else item = relation.relatedAnime ?? relation.anime;
    if (!item?.id && relation.id != null) {
      item = { id: Number(relation.id), title: relation.title, poster: relation.poster as string };
    }
    pushItem(item);
  }

  return result;
}

/** Compact episode caption: "1 Эпизод" (never "Эп. 1 · Episode 1"). */
export function episodeLabel(ep: AnimeEpisode): string {
  const ordinal = ep.ordinal ?? ep.id;
  return `${ordinal} Эпизод`;
}
