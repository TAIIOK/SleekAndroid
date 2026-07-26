export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

function parseTimestamp(raw: string): number | null {
  const cleaned = raw.trim().replace(',', '.');
  const parts = cleaned.split(':');
  if (parts.length < 2 || parts.length > 3) return null;

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (parts.length === 3) {
    hours = Number(parts[0]);
    minutes = Number(parts[1]);
    seconds = Number(parts[2]);
  } else {
    minutes = Number(parts[0]);
    seconds = Number(parts[1]);
  }

  if (![hours, minutes, seconds].every((n) => Number.isFinite(n))) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

function stripTags(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

function parseCueBlock(lines: string[]): SubtitleCue | null {
  const timingLine = lines.find((line) => line.includes('-->'));
  if (!timingLine) return null;

  const [startRaw, endRaw] = timingLine.split('-->').map((part) => part.trim().split(/\s+/)[0] ?? '');
  const start = parseTimestamp(startRaw);
  const end = parseTimestamp(endRaw);
  if (start == null || end == null || end <= start) return null;

  const textLines = lines.filter((line) => line !== timingLine && !/^\d+$/.test(line.trim()));
  const text = stripTags(textLines.join('\n'));
  if (!text) return null;

  return { start, end, text };
}

export function parseVtt(content: string): SubtitleCue[] {
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const body = normalized.replace(/^WEBVTT[^\n]*\n?/, '');
  const blocks = body.split(/\n{2,}/);
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((line) => line.trimEnd())
      .filter(
        (line) =>
          line.length > 0 &&
          !line.startsWith('NOTE') &&
          !line.startsWith('STYLE') &&
          !line.startsWith('REGION') &&
          !line.startsWith('X-TIMESTAMP-MAP'),
      );
    if (!lines.length) continue;
    const cue = parseCueBlock(lines);
    if (cue) cues.push(cue);
  }

  return cues.sort((a, b) => a.start - b.start);
}

export function parseSrt(content: string): SubtitleCue[] {
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n{2,}/);
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((line) => line.trimEnd())
      .filter((line) => line.length > 0);
    if (!lines.length) continue;
    const cue = parseCueBlock(lines);
    if (cue) cues.push(cue);
  }

  return cues.sort((a, b) => a.start - b.start);
}

export function parseSubtitleContent(content: string, format: 'vtt' | 'srt'): SubtitleCue[] {
  const primary = format === 'srt' ? parseSrt(content) : parseVtt(content);
  if (primary.length) return primary;
  // Some sources label files `.vtt` but ship SRT bodies (or the reverse).
  return format === 'srt' ? parseVtt(content) : parseSrt(content);
}

function looksLikeHtmlOrError(text: string): boolean {
  const head = text.slice(0, 200).trim().toLowerCase();
  return (
    head.startsWith('<!doctype') ||
    head.startsWith('<html') ||
    head.startsWith('<?xml') ||
    head.includes('<html') ||
    (head.startsWith('{') && head.includes('error'))
  );
}

export function detectSubtitleFormat(url: string): 'vtt' | 'srt' {
  const path = url.split('?')[0]?.split('#')[0]?.toLowerCase() ?? '';
  if (path.endsWith('.srt') || path.includes('.srt')) return 'srt';
  return 'vtt';
}

/** Fetch sidecar VTT/SRT. Failures return null — never block video. */
export async function fetchSubtitleText(url: string): Promise<string | null> {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const res = await fetch(trimmed);
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.trim() || looksLikeHtmlOrError(text)) return null;
    return text;
  } catch {
    return null;
  }
}

export async function fetchSubtitleCues(url: string, format?: 'vtt' | 'srt'): Promise<SubtitleCue[]> {
  const text = await fetchSubtitleText(url);
  if (!text) return [];
  return parseSubtitleContent(text, format ?? detectSubtitleFormat(url));
}

export function findActiveCues(cues: SubtitleCue[], time: number): SubtitleCue[] {
  if (!cues.length || !Number.isFinite(time)) return [];
  let lo = 0;
  let hi = cues.length - 1;
  let startIdx = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].end <= time) lo = mid + 1;
    else {
      startIdx = mid;
      hi = mid - 1;
    }
  }
  const active: SubtitleCue[] = [];
  for (let i = startIdx; i < cues.length; i += 1) {
    const cue = cues[i];
    if (cue.start > time + 1) break;
    if (time >= cue.start && time < cue.end) active.push(cue);
  }
  return active;
}
