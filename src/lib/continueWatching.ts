import { resolvePosterUrl } from '@/lib/config';
import { lampaDetailPath, lampaTitle } from '@/lib/lampaDetail';
import {
  animeProgressByEpisodeId,
  groupLampaProgressById,
  lampaProgressByKey,
} from '@/lib/progressUtils';
import { extractPosterPath } from '@/lib/poster';
import type { SavedAnimeItem } from '@/types/progress';
import type { UserAnimeProgress, UserLampaProgress } from '@/types/progress';

export interface ContinueWatchingItem {
  id: string;
  title: string;
  poster?: string;
  subtitle: string;
  progress: number;
  href: string;
  startProgress?: number;
  kind: 'anime' | 'movie' | 'tv';
  animeId?: number;
  episodeId?: number;
}

function resolveAnimeListTitle(anime?: Record<string, unknown>): string | undefined {
  if (!anime) return undefined;
  for (const key of ['title', 'alternativeTitle', 'titleEn', 'name']) {
    const value = anime[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function pickAnimeContinue(
  sa: SavedAnimeItem,
  progressRows: UserAnimeProgress[],
): ContinueWatchingItem | null {
  const animeId = sa.animeId ?? sa.id;
  if (!animeId) return null;

  const progressMap = animeProgressByEpisodeId(progressRows, animeId);
  let bestEpisodeId: number | undefined;
  let bestProgress = 0;

  for (const [epId, value] of Object.entries(progressMap)) {
    if (value <= 0.01 || value >= 0.98) continue;
    if (value >= bestProgress) {
      bestProgress = value;
      bestEpisodeId = Number(epId);
    }
  }

  if (!bestEpisodeId && sa.status !== 'watching') return null;
  if (!bestEpisodeId && sa.lastWatchingEpisode) bestEpisodeId = sa.lastWatchingEpisode;
  if (!bestEpisodeId && bestProgress <= 0) return null;

  const detail = sa.anime;
  const title = resolveAnimeListTitle(detail) ?? sa.title ?? `Аниме ${animeId}`;
  const poster = detail ? extractPosterPath(detail.poster) : sa.poster;

  return {
    id: `anime-${animeId}`,
    title,
    poster: poster ? resolvePosterUrl(poster) : undefined,
    subtitle: 'Продолжить',
    progress: Math.min(1, Math.max(0.02, bestProgress)),
    href: bestEpisodeId
      ? `/watch/anime/${animeId}/${bestEpisodeId}`
      : `/anime/${animeId}`,
    startProgress: bestEpisodeId ? bestProgress : undefined,
    kind: 'anime',
    animeId,
    episodeId: bestEpisodeId,
  };
}

export function applyEpisodeOrdinalsToContinueItems(
  items: ContinueWatchingItem[],
  ordinalByEpisodeId: Map<number, number>,
): ContinueWatchingItem[] {
  return items.map((item) => {
    if (item.kind !== 'anime' || !item.episodeId) return item;
    const ordinal = ordinalByEpisodeId.get(item.episodeId);
    if (!ordinal) return item;
    return { ...item, subtitle: `Эпизод ${ordinal}` };
  });
}

function pickLampaContinue(
  item: Record<string, unknown>,
  progressRows: UserLampaProgress[],
): ContinueWatchingItem | null {
  const nested = item.lampa as Record<string, unknown> | undefined;
  const kind = String(nested?.kind ?? item.kind ?? item.mediaKind ?? 'movie');
  const routeItem = nested ?? item;
  const routeId = lampaDetailPath(kind, routeItem);
  if (!routeId || routeId.endsWith('/')) return null;

  const lampaId = String(
    nested?.objectId ?? item.lampaObjectId ?? nested?.id ?? item.id ?? '',
  ).trim();
  const progressMap = lampaProgressByKey(progressRows, lampaId || undefined);
  const progress = Object.values(progressMap).length
    ? Math.max(...Object.values(progressMap))
    : 0;

  if (progress <= 0.01 && item.status !== 'watching') return null;

  const title = nested ? lampaTitle(nested) : String(item.title ?? item.name ?? 'Без названия');
  const season = item.season ?? item.lastSeason ?? item.lastSeasson;
  const episode = item.episode ?? item.lastEpisode ?? item.lastWatchingEpisode;
  const subtitle =
    season != null && episode != null
      ? `Сезон ${season} · Эпизод ${episode}`
      : 'Продолжить';

  const posterRaw = String(
    nested?.poster ??
      nested?.posterPath ??
      nested?.poster_path ??
      item.poster ??
      item.posterPath ??
      item.poster_path ??
      '',
  );

  return {
    id: `lampa-${kind}-${routeItem.id ?? routeItem.objectId ?? routeItem.tmdbId}`,
    title,
    poster: resolvePosterUrl(posterRaw),
    subtitle,
    progress: Math.min(1, Math.max(0.02, progress)),
    href: routeId,
    kind: kind === 'tv' ? 'tv' : 'movie',
  };
}

export function buildContinueWatchingItems(
  savedAnime: SavedAnimeItem[],
  savedLampa: unknown[],
  animeProgress: UserAnimeProgress[] = [],
  lampaProgress: UserLampaProgress[] = [],
): ContinueWatchingItem[] {
  const items: ContinueWatchingItem[] = [];
  const lampaProgressByObjectId = groupLampaProgressById(lampaProgress);

  for (const sa of savedAnime) {
    const entry = pickAnimeContinue(sa, animeProgress);
    if (entry) items.push(entry);
  }

  for (const raw of savedLampa) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const nested = row.lampa as Record<string, unknown> | undefined;
    const lampaId = String(
      nested?.objectId ?? row.lampaObjectId ?? nested?.id ?? row.id ?? '',
    ).trim();
    const rows = lampaId ? (lampaProgressByObjectId.get(lampaId) ?? []) : lampaProgress;
    const entry = pickLampaContinue(row, rows);
    if (entry) items.push(entry);
  }

  return items.slice(0, 16);
}

export function formatProgressTime(fraction: number, durationSec = 24 * 60): string {
  const sec = Math.floor(fraction * durationSec);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
