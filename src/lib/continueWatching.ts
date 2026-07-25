import { resolveLampaPosterUrl, resolvePosterUrl } from '@/lib/config';
import { lampaDetailPath, lampaDetailRouteId, lampaTitle } from '@/lib/lampaDetail';
import {
  animePlaybackDurationKey,
  getPlaybackDuration,
  lampaPlaybackDurationKey,
} from '@/lib/playbackDurationStore';
import {
  animeProgressByEpisodeId,
  groupAnimeProgressByAnimeId,
  groupLampaProgressById,
  isUnfinishedProgress,
  normalizeProgress,
  pickLatestUnfinishedAnimeRow,
  pickLatestUnfinishedLampaRow,
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
  /** Real media duration in seconds when known (for time labels). */
  durationSec?: number;
  href: string;
  startProgress?: number;
  kind: 'anime' | 'movie' | 'tv';
  animeId?: number;
  episodeId?: number;
  /** Numeric TMDB/route id for Lampa resume. */
  routeId?: string;
  season?: number;
  episode?: number;
  /** Used for sorting only; stripped before UI if needed. */
  updatedAtMs?: number;
}

interface LampaMeta {
  title?: string;
  poster?: string;
  kind?: 'movie' | 'tv';
  routeId?: string;
  season?: number;
  episode?: number;
  status?: string;
}

function resolveAnimeListTitle(anime?: Record<string, unknown>): string | undefined {
  if (!anime) return undefined;
  for (const key of ['title', 'alternativeTitle', 'titleEn', 'name']) {
    const value = anime[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function parseDateMs(value?: string): number {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function hasWatchProgress(progress: number, completed?: boolean): boolean {
  return isUnfinishedProgress(progress, completed);
}

function indexSavedLampa(savedLampa: unknown[]): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  for (const raw of savedLampa) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const nested = row.lampa as Record<string, unknown> | undefined;
    const keys = [
      nested?.objectId,
      row.lampaObjectId,
      nested?.id,
      nested?.tmdbId,
      nested?.rawId,
      row.id,
    ];
    for (const key of keys) {
      if (key == null) continue;
      const text = String(key).trim();
      if (text) map.set(text, row);
    }
  }
  return map;
}

function progressRowsForSavedLampa(
  row: Record<string, unknown>,
  byId: Map<string, UserLampaProgress[]>,
): UserLampaProgress[] {
  const nested = row.lampa as Record<string, unknown> | undefined;
  const keys = [
    nested?.objectId,
    row.lampaObjectId,
    nested?.id,
    nested?.tmdbId,
    nested?.rawId,
    row.id,
  ];
  for (const key of keys) {
    if (key == null) continue;
    const rows = byId.get(String(key).trim());
    if (rows?.length) return rows;
  }
  return [];
}

function lampaMetaFromSaved(row?: Record<string, unknown>): LampaMeta {
  if (!row) return {};
  const nested = row.lampa as Record<string, unknown> | undefined;
  const kindRaw = String(nested?.kind ?? row.kind ?? row.mediaKind ?? '');
  const kind = kindRaw === 'tv' || kindRaw === 'home' ? 'tv' : kindRaw === 'movie' ? 'movie' : undefined;
  const routeItem = nested ?? {
    id: row.id,
    tmdbId: row.tmdbId,
    objectId: row.lampaObjectId,
  };
  const routeId = lampaDetailRouteId(routeItem as Parameters<typeof lampaDetailRouteId>[0]);
  const posterRaw = String(
    nested?.poster ??
      nested?.posterPath ??
      nested?.poster_path ??
      row.poster ??
      row.posterPath ??
      row.poster_path ??
      '',
  );
  return {
    title: nested ? lampaTitle(nested) : String(row.title ?? row.name ?? '').trim() || undefined,
    poster: resolveLampaPosterUrl(posterRaw) ?? resolvePosterUrl(posterRaw),
    kind,
    routeId: routeId || undefined,
    season: Number(row.lastSeason ?? row.lastSeasson ?? row.season) || undefined,
    episode: Number(row.lastEpisode ?? row.lastWatchingEpisode ?? row.episode) || undefined,
    status: typeof row.status === 'string' ? row.status : undefined,
  };
}

/** Pull title/poster/kind/route hints from activity history feed rows. */
export function buildLampaMetaFromHistoryFeed(feedRows: unknown[]): Map<string, LampaMeta> {
  const map = new Map<string, LampaMeta>();

  for (const raw of feedRows) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const snapshot =
      row.snapshot && typeof row.snapshot === 'object'
        ? (row.snapshot as Record<string, unknown>)
        : typeof row.snapshot === 'string'
          ? (() => {
              try {
                const parsed = JSON.parse(row.snapshot) as unknown;
                return parsed && typeof parsed === 'object'
                  ? (parsed as Record<string, unknown>)
                  : {};
              } catch {
                return {};
              }
            })()
          : {};

    const kindRaw = String(
      snapshot.kind ?? snapshot.mediaKind ?? row.kind ?? row.mediaKind ?? '',
    ).toLowerCase();
    const kind =
      kindRaw === 'tv' || kindRaw === 'series' || kindRaw === 'home'
        ? 'tv'
        : kindRaw === 'movie' || kindRaw === 'films'
          ? 'movie'
          : undefined;

    const objectIds = [
      row.objectId,
      row.lampaObjectId,
      row.lampaId,
      snapshot.objectId,
      snapshot.lampaId,
      row.entityId,
      row.entity_id,
    ]
      .map((value) => (value == null ? '' : String(value).trim()))
      .filter(Boolean);

    const routeId = lampaDetailRouteId({
      id: (snapshot.id ?? row.id ?? snapshot.tmdbId ?? row.tmdbId) as string | number | undefined,
      tmdbId: (snapshot.tmdbId ?? row.tmdbId) as string | number | undefined,
      rawId: snapshot.rawId as string | number | undefined,
      objectId: objectIds[0],
    });

    const title = String(
      snapshot.title ?? snapshot.name ?? row.title ?? row.name ?? '',
    ).trim();
    const posterRaw = String(
      snapshot.poster ??
        snapshot.posterPath ??
        snapshot.poster_path ??
        row.poster ??
        row.posterPath ??
        '',
    );
    const poster = resolveLampaPosterUrl(posterRaw) ?? resolvePosterUrl(posterRaw);
    const meta: LampaMeta = {
      title: title || undefined,
      poster: poster || undefined,
      kind,
      routeId: routeId || undefined,
    };

    for (const id of objectIds) {
      const prev = map.get(id) ?? {};
      map.set(id, {
        title: prev.title ?? meta.title,
        poster: prev.poster ?? meta.poster,
        kind: prev.kind ?? meta.kind,
        routeId: prev.routeId ?? meta.routeId,
      });
    }
    if (routeId) {
      const prev = map.get(routeId) ?? {};
      map.set(routeId, {
        title: prev.title ?? meta.title,
        poster: prev.poster ?? meta.poster,
        kind: prev.kind ?? meta.kind,
        routeId: prev.routeId ?? meta.routeId,
      });
    }
  }

  return map;
}

function inferLampaKind(
  rows: UserLampaProgress[],
  meta: LampaMeta,
): 'movie' | 'tv' {
  if (meta.kind) return meta.kind;
  const serial = rows.some((row) => row.seasonOrdinal > 0 || row.episodeOrdinal > 0);
  return serial ? 'tv' : 'movie';
}

function resolveLampaHref(kind: 'movie' | 'tv', lampaId: string, meta: LampaMeta): string | null {
  const numeric =
    meta.routeId ||
    (/^\d+$/.test(lampaId.trim()) ? lampaId.trim() : '');
  if (!numeric) return null;
  return lampaDetailPath(kind, { id: numeric, tmdbId: Number(numeric) });
}

function pickAnimeContinueFromProgress(
  animeId: number,
  progressRows: UserAnimeProgress[],
  saved?: SavedAnimeItem,
): ContinueWatchingItem | null {
  const latest = pickLatestUnfinishedAnimeRow(progressRows);
  if (!latest) {
    if (saved?.status !== 'watching') return null;
    return pickAnimeContinue(saved, progressRows);
  }

  const progress = normalizeProgress(latest.progress);
  const detail = saved?.anime;
  const title = resolveAnimeListTitle(detail) ?? saved?.title ?? `Аниме ${animeId}`;
  const poster = detail ? extractPosterPath(detail.poster) : saved?.poster;

  return {
    id: `anime-${animeId}`,
    title,
    poster: poster ? resolvePosterUrl(poster) : undefined,
    subtitle: 'Продолжить',
    progress,
    durationSec: getPlaybackDuration(animePlaybackDurationKey(animeId, latest.episodeId)),
    href: `/watch/anime/${animeId}/${latest.episodeId}`,
    startProgress: progress,
    kind: 'anime',
    animeId,
    episodeId: latest.episodeId,
    updatedAtMs: parseDateMs(latest.updatedAt),
  };
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
    if (!hasWatchProgress(value)) continue;
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
    progress: bestProgress,
    durationSec:
      bestEpisodeId != null
        ? getPlaybackDuration(animePlaybackDurationKey(animeId, bestEpisodeId))
        : undefined,
    href: bestEpisodeId
      ? `/watch/anime/${animeId}/${bestEpisodeId}`
      : `/anime/${animeId}`,
    startProgress: bestEpisodeId ? bestProgress : undefined,
    kind: 'anime',
    animeId,
    episodeId: bestEpisodeId,
  };
}

function pickLampaContinueFromProgress(
  lampaId: string,
  progressRows: UserLampaProgress[],
  savedMeta: LampaMeta,
  historyMeta: LampaMeta,
): ContinueWatchingItem | null {
  const meta: LampaMeta = {
    title: savedMeta.title ?? historyMeta.title,
    poster: savedMeta.poster ?? historyMeta.poster,
    kind: savedMeta.kind ?? historyMeta.kind,
    routeId: savedMeta.routeId ?? historyMeta.routeId,
    season: savedMeta.season ?? historyMeta.season,
    episode: savedMeta.episode ?? historyMeta.episode,
    status: savedMeta.status,
  };

  const latest = pickLatestUnfinishedLampaRow(progressRows);
  if (!latest) {
    if (meta.status !== 'watching') return null;
    const kind = inferLampaKind(progressRows, meta);
    const href = resolveLampaHref(kind, lampaId, meta);
    if (!href) return null;
    const routeId =
      meta.routeId || (/^\d+$/.test(lampaId.trim()) ? lampaId.trim() : undefined);
    return {
      id: `lampa-${kind}-${meta.routeId ?? lampaId}`,
      title: meta.title ?? 'Без названия',
      poster: meta.poster,
      subtitle:
        meta.season != null && meta.episode != null
          ? `Сезон ${meta.season} · Эпизод ${meta.episode}`
          : 'Продолжить',
      progress: 0.001,
      href,
      kind,
      routeId,
      season: meta.season,
      episode: meta.episode,
    };
  }

  const progress = normalizeProgress(latest.progress);
  const kind = inferLampaKind(progressRows, meta);
  const href = resolveLampaHref(kind, lampaId, meta);
  if (!href) return null;

  const season =
    latest.seasonOrdinal > 0 ? latest.seasonOrdinal : meta.season;
  const episode =
    latest.episodeOrdinal > 0 ? latest.episodeOrdinal : meta.episode;
  const routeId =
    meta.routeId || (/^\d+$/.test(lampaId.trim()) ? lampaId.trim() : undefined);

  return {
    id: `lampa-${kind}-${meta.routeId ?? lampaId}`,
    title: meta.title ?? 'Без названия',
    poster: meta.poster,
    subtitle:
      kind === 'tv' && season != null && episode != null
        ? `Сезон ${season} · Эпизод ${episode}`
        : 'Продолжить',
    progress,
    durationSec: getPlaybackDuration(
      lampaPlaybackDurationKey(lampaId, latest.seasonOrdinal, latest.episodeOrdinal),
    ),
    href,
    startProgress: progress,
    kind,
    routeId,
    season: season ?? undefined,
    episode: episode ?? undefined,
    updatedAtMs: parseDateMs(latest.updatedAt),
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

export function buildContinueWatchingItems(
  savedAnime: SavedAnimeItem[],
  savedLampa: unknown[],
  animeProgress: UserAnimeProgress[] = [],
  lampaProgress: UserLampaProgress[] = [],
  historyFeed: unknown[] = [],
): ContinueWatchingItem[] {
  const items: ContinueWatchingItem[] = [];
  const seenAnime = new Set<number>();
  const seenLampa = new Set<string>();

  const savedAnimeById = new Map<number, SavedAnimeItem>();
  for (const saved of savedAnime) {
    const animeId = saved.animeId ?? saved.id;
    if (animeId != null) savedAnimeById.set(animeId, saved);
  }

  const savedLampaById = indexSavedLampa(savedLampa);
  const historyLampaMeta = buildLampaMetaFromHistoryFeed(historyFeed);
  const lampaProgressById = groupLampaProgressById(lampaProgress);

  for (const [animeId, rows] of groupAnimeProgressByAnimeId(animeProgress)) {
    const entry = pickAnimeContinueFromProgress(animeId, rows, savedAnimeById.get(animeId));
    if (!entry) continue;
    items.push(entry);
    seenAnime.add(animeId);
  }

  for (const [lampaId, rows] of lampaProgressById) {
    const saved = savedLampaById.get(lampaId);
    const entry = pickLampaContinueFromProgress(
      lampaId,
      rows,
      lampaMetaFromSaved(saved),
      historyLampaMeta.get(lampaId) ?? {},
    );
    if (!entry) continue;
    items.push(entry);
    seenLampa.add(lampaId);
    if (entry.href) {
      const match = entry.href.match(/\/(movies|series)\/(\d+)/);
      if (match) seenLampa.add(match[2]);
    }
  }

  for (const sa of savedAnime) {
    const animeId = sa.animeId ?? sa.id;
    if (animeId == null || seenAnime.has(animeId)) continue;
    const entry = pickAnimeContinue(sa, []);
    if (!entry) continue;
    items.push(entry);
    seenAnime.add(animeId);
  }

  for (const raw of savedLampa) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const nested = row.lampa as Record<string, unknown> | undefined;
    const primaryId = String(
      nested?.objectId ?? row.lampaObjectId ?? nested?.id ?? row.id ?? '',
    ).trim();
    if (!primaryId || seenLampa.has(primaryId)) continue;
    if (nested?.id != null && seenLampa.has(String(nested.id))) continue;

    const rows = progressRowsForSavedLampa(row, lampaProgressById);
    const entry = pickLampaContinueFromProgress(
      primaryId,
      rows,
      lampaMetaFromSaved(row),
      historyLampaMeta.get(primaryId) ?? {},
    );
    if (!entry) continue;
    items.push(entry);
    seenLampa.add(primaryId);
  }

  items.sort((a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0));
  return items.slice(0, 16);
}

export function formatProgressTime(fraction: number, durationSec: number): string {
  const sec = Math.max(0, Math.floor(fraction * durationSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Time + percent when duration is known; percent alone otherwise. */
export function formatContinueProgressLabel(
  fraction: number,
  durationSec?: number,
): string {
  const progress = Math.min(1, Math.max(0, fraction));
  const pct = `${Math.max(1, Math.round(progress * 100))}%`;
  if (durationSec != null && durationSec > 1) {
    return `${formatProgressTime(progress, durationSec)} · ${pct}`;
  }
  return pct;
}
