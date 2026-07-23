import type { AnimeEpisode, AnimeVideo } from '@aniverse/types';

/**
 * Normalize API episode payloads (nested `episode`, screenshot/poster variants).
 * Mirrors site `normalizeEpisode` so thumbnails survive into the TV/phone client.
 */
export function normalizeEpisode(raw: unknown): AnimeEpisode {
  if (!raw || typeof raw !== 'object') return raw as AnimeEpisode;
  const row = raw as Record<string, unknown>;
  const nested =
    row.episode && typeof row.episode === 'object'
      ? (row.episode as Record<string, unknown>)
      : null;
  const base = nested ?? row;
  const ordinalRaw = base.ordinal ?? base.number;
  const ordinal =
    typeof ordinalRaw === 'number'
      ? ordinalRaw
      : typeof ordinalRaw === 'string'
        ? Number(ordinalRaw)
        : undefined;

  const episode = {
    id: Number(base.id),
    ordinal: Number.isFinite(ordinal) && (ordinal as number) > 0 ? ordinal : undefined,
    title: typeof base.title === 'string' ? base.title : undefined,
    duration: typeof base.duration === 'number' ? base.duration : undefined,
    video: readEpisodeVideos(row, base),
  } as AnimeEpisode & { poster?: unknown; screenshot?: unknown };

  const poster = readEpisodeMediaField(base.poster);
  const screenshot = readEpisodeMediaField(base.screenshot ?? base.image ?? base.thumbnail);
  if (poster !== undefined) episode.poster = poster;
  if (screenshot !== undefined) episode.screenshot = screenshot;

  return episode;
}

function readEpisodeVideos(
  row: Record<string, unknown>,
  base: Record<string, unknown>,
): AnimeVideo[] | undefined {
  const raw =
    row.video ?? row.videos ?? row.Video ?? row.Videos ?? base.video ?? base.videos;
  if (Array.isArray(raw)) return raw as AnimeVideo[];
  return undefined;
}

function readEpisodeMediaField(value: unknown): unknown {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (value && typeof value === 'object') return value;
  return undefined;
}
