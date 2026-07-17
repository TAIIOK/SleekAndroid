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

export interface PlayerSkipSegment {
  id: string;
  type: 'opening' | 'ending';
  title: string;
  start: number;
  end: number;
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

/** @deprecated use parseSkipResponse */
export function parseSkipInterval(
  response: SkipResponse | null | undefined,
  type: 'opening' | 'ending',
): { start: number; end: number } | undefined {
  return parseSkipResponse(response, type);
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

export function findActiveSkipPrompt(
  segments: PlayerSkipSegment[],
  currentTime: number,
  dismissed: Set<string>,
): PlayerSkipSegment | undefined {
  return segments.find((segment) => {
    if (dismissed.has(segment.id)) return false;
    if (currentTime < segment.start || currentTime >= segment.end) return false;
    const promptEnd = Math.min(segment.end, segment.start + 8);
    return currentTime <= promptEnd;
  });
}
