import type { AnimeEpisode, AnimeVideo } from '@aniverse/types';

export interface SkipDataItem {
  skipType?: string;
  skip_type?: string;
  interval?: {
    startTime?: number;
    start_time?: number;
    endTime?: number;
    end_time?: number;
  };
}

export interface SkipResponse {
  data?: SkipDataItem[];
  opening?: { start?: number; end?: number };
  ending?: { start?: number; end?: number };
  start?: number;
  end?: number;
}

export type LampaSkipSegmentType = 'intro' | 'recap' | 'credits' | 'preview';

export interface LampaSkipSegment {
  type: LampaSkipSegmentType | string;
  start: number;
  end: number;
}

export interface LampaSkipSegmentsData {
  segments: LampaSkipSegment[];
  source?: string;
}

export type PlayerSkipSegmentType = 'opening' | 'ending' | 'intro' | 'credits';

export interface PlayerSkipSegment {
  id: string;
  type: PlayerSkipSegmentType;
  title: string;
  start: number;
  end: number;
}

/** Runtime episode fields that may arrive from catalog but are not on AnimeEpisode. */
type EpisodeSkipFields = AnimeEpisode & {
  openingStart?: number;
  openingEnd?: number;
  endingStart?: number;
  endingEnd?: number;
};

type VideoSkips = {
  intro?: { start?: number; end?: number };
  outro?: { start?: number; end?: number };
  opening?: { start?: number; end?: number };
  ending?: { start?: number; end?: number };
};

export function isOpeningLikeSkip(type: PlayerSkipSegmentType): boolean {
  return type === 'opening' || type === 'intro';
}

export function isEndingLikeSkip(type: PlayerSkipSegmentType): boolean {
  return type === 'ending' || type === 'credits';
}

function readInterval(item: SkipDataItem | undefined): { start: number; end: number } | undefined {
  if (!item?.interval) return undefined;
  const start = item.interval.startTime ?? item.interval.start_time;
  const end = item.interval.endTime ?? item.interval.end_time;
  if (start == null || end == null || end <= start) return undefined;
  return { start, end };
}

function skipTypeMatches(raw: string | undefined, type: 'opening' | 'ending'): boolean {
  const value = (raw ?? '').trim().toLowerCase();
  if (type === 'opening') return value === 'op' || value === 'opening' || value === 'intro';
  return value === 'ed' || value === 'ending' || value === 'outro';
}

export function parseSkipResponse(
  response: SkipResponse | null | undefined,
  type: 'opening' | 'ending',
): { start: number; end: number } | undefined {
  if (!response) return undefined;

  const items = Array.isArray(response.data) ? response.data : [];
  if (items.length > 0) {
    const match =
      items.find((item) => skipTypeMatches(item.skipType ?? item.skip_type, type)) ?? items[0];
    const interval = readInterval(match);
    if (interval) return interval;
  }

  const nested = type === 'opening' ? response.opening : response.ending;
  const start = nested?.start ?? response.start;
  const end = nested?.end ?? response.end;
  if (start == null || end == null || end <= start) return undefined;
  return { start, end };
}

export function skipSegmentsFromEpisode(episode?: AnimeEpisode | null): PlayerSkipSegment[] {
  if (!episode) return [];
  const ep = episode as EpisodeSkipFields;

  const opening =
    ep.openingStart != null && ep.openingEnd != null && ep.openingEnd > ep.openingStart
      ? { start: ep.openingStart, end: ep.openingEnd }
      : undefined;

  const ending =
    ep.endingStart != null && ep.endingEnd != null && ep.endingEnd > ep.endingStart
      ? { start: ep.endingStart, end: ep.endingEnd }
      : undefined;

  return buildSkipSegments(opening, ending);
}

export function skipSegmentsFromVideos(videos: AnimeVideo[] | undefined): PlayerSkipSegment[] {
  if (!videos?.length) return [];

  let opening: { start: number; end: number } | undefined;
  let ending: { start: number; end: number } | undefined;

  for (const video of videos) {
    const skips = (video as AnimeVideo & { skips?: VideoSkips }).skips;
    if (!skips) continue;

    const intro = skips.intro ?? skips.opening;
    const outro = skips.outro ?? skips.ending;

    if (!opening && intro?.start != null && intro.end != null && intro.end > intro.start) {
      opening = { start: intro.start, end: intro.end };
    }
    if (!ending && outro?.start != null && outro.end != null && outro.end > outro.start) {
      ending = { start: outro.start, end: outro.end };
    }
  }

  return buildSkipSegments(opening, ending);
}

export function buildSkipSegments(
  opening?: { start: number; end: number },
  ending?: { start: number; end: number },
): PlayerSkipSegment[] {
  const segments: PlayerSkipSegment[] = [];
  if (opening) {
    segments.push({
      id: 'opening',
      type: 'opening',
      title: 'Пропустить опенинг',
      start: opening.start,
      end: opening.end,
    });
  }
  if (ending) {
    segments.push({
      id: 'ending',
      type: 'ending',
      title: 'Пропустить эндинг',
      start: ending.start,
      end: ending.end,
    });
  }
  return segments;
}

const LAMPA_SKIP_TITLES: Record<'intro' | 'credits', string> = {
  intro: 'Пропустить интро',
  credits: 'Пропустить титры',
};

export function buildLampaSkipSegments(
  apiSegments: LampaSkipSegment[] | null | undefined,
): PlayerSkipSegment[] {
  if (!apiSegments?.length) return [];

  const segments: PlayerSkipSegment[] = [];
  const seen = new Set<'intro' | 'credits'>();

  for (const raw of apiSegments) {
    const type = (raw.type ?? '').trim().toLowerCase();
    if (type !== 'intro' && type !== 'credits') continue;
    if (seen.has(type)) continue;

    const start = Number(raw.start);
    const end = Number(raw.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;

    seen.add(type);
    segments.push({
      id: type,
      type,
      title: LAMPA_SKIP_TITLES[type],
      start,
      end,
    });
  }

  return segments.sort((a, b) => a.start - b.start);
}

export function mergeSkipSegments(...groups: PlayerSkipSegment[][]): PlayerSkipSegment[] {
  const merged = new Map<string, PlayerSkipSegment>();
  for (const group of groups) {
    for (const segment of group) {
      merged.set(segment.id, segment);
    }
  }
  return [...merged.values()].sort((a, b) => a.start - b.start);
}

/** @deprecated use parseSkipResponse */
export function parseSkipInterval(
  response: SkipResponse | null | undefined,
  type: 'opening' | 'ending',
): { start: number; end: number } | undefined {
  return parseSkipResponse(response, type);
}

export function findActiveSkipPrompt(
  segments: PlayerSkipSegment[],
  currentTime: number,
  dismissed: Set<string>,
): PlayerSkipSegment | undefined {
  if (!Number.isFinite(currentTime) || currentTime < 0) return undefined;

  return segments.find((segment) => {
    if (dismissed.has(segment.id)) return false;
    const start = segment.start;
    const end = segment.end;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return false;
    if (currentTime < start || currentTime >= end) return false;
    // Show skip CTA during the first 5 seconds of the segment (Sleek parity).
    const promptEnd = Math.min(end, start + 5);
    return currentTime <= promptEnd;
  });
}
