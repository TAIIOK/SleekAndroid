/** Subtitle track shape used by the in-app player HUD. */
export interface SubtitleTrackInfo {
  id?: string;
  language: string;
  label: string;
  name?: string;
  isDefault?: boolean;
  /** Sidecar VTT/SRT URL — use as-is from WatchHub. */
  url?: string;
  source?: 'external' | 'stream';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return undefined;
}

function detectFormat(url: string, explicit?: string): 'vtt' | 'srt' | null {
  const raw = (explicit ?? '').trim().toLowerCase();
  if (raw === 'vtt' || raw === 'webvtt' || raw.includes('vtt')) return 'vtt';
  if (raw === 'srt' || raw.includes('srt')) return 'srt';

  const path = url.split('?')[0]?.split('#')[0]?.toLowerCase() ?? '';
  if (path.endsWith('.vtt') || path.endsWith('.webvtt')) return 'vtt';
  if (path.endsWith('.srt')) return 'srt';
  // WatchHub proxy URLs: `.../proxy/<hash>.vtt`
  if (path.includes('.vtt')) return 'vtt';
  if (path.includes('.srt')) return 'srt';
  return null;
}

function stableSidecarId(label: string, index: number): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '');
  return `sidecar-${slug || index}`;
}

function labelsEqual(a: string, b: string): boolean {
  return a.trim().localeCompare(b.trim(), 'ru', { sensitivity: 'accent' }) === 0;
}

function normalizeOne(raw: unknown, index: number): SubtitleTrackInfo | null {
  if (typeof raw === 'string') {
    const url = raw.trim();
    if (!url) return null;
    const format = detectFormat(url);
    if (!format) return null;
    return {
      id: `track-${index}-${format}`,
      language: '',
      label: format.toUpperCase(),
      url,
      source: 'external',
    };
  }

  if (!isRecord(raw)) return null;

  const url = readString(raw.url, raw.src, raw.file, raw.href);
  if (!url) return null;

  const language = readString(raw.language, raw.lang, raw.locale) ?? '';
  const label =
    readString(raw.label, raw.title, raw.name) ??
    (language ? language.toUpperCase() : undefined);

  // Sidecar contract: `{ label, url }` is WebVTT even when extension is omitted.
  let format = detectFormat(url, readString(raw.format, raw.type, raw.kind));
  if (!format && label) format = 'vtt';
  if (!format) return null;

  const resolvedLabel = label ?? format.toUpperCase();
  const id =
    readString(raw.id, raw.key) ??
    (label
      ? stableSidecarId(resolvedLabel, index)
      : `track-${index}-${language || format}-${resolvedLabel}`);

  return {
    id,
    language,
    label: resolvedLabel,
    url,
    source: 'external',
  };
}

/** Normalize API subtitle payloads into a stable track list. */
export function normalizeSubtitleTracks(raw: unknown): SubtitleTrackInfo[] {
  if (raw == null) return [];

  const candidates: unknown[] = [];
  if (Array.isArray(raw)) {
    candidates.push(...raw);
  } else if (isRecord(raw)) {
    const nested =
      raw.subtitles ?? raw.subtitle ?? raw.captions ?? raw.tracks ?? raw.files ?? raw.items;
    if (Array.isArray(nested)) {
      candidates.push(...nested);
    } else if (nested != null) {
      candidates.push(nested);
    } else {
      candidates.push(raw);
    }
  } else {
    candidates.push(raw);
  }

  const seen = new Set<string>();
  const tracks: SubtitleTrackInfo[] = [];
  candidates.forEach((item, index) => {
    const track = normalizeOne(item, index);
    if (!track) return;
    const key = `${track.label}::${track.url ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    tracks.push(track);
  });
  return tracks;
}

/** Read subtitle fields from a video/link object or parent record. */
export function readSubtitleTracksFromSource(source: unknown): SubtitleTrackInfo[] {
  if (!isRecord(source)) return normalizeSubtitleTracks(source);
  const nested = source.subtitles ?? source.subtitle ?? source.captions ?? source.tracks;
  if (nested != null) return normalizeSubtitleTracks(nested);
  return [];
}

/**
 * Lampa / WatchHub sidecar tracks (`links[].subtitles`).
 * Prefer the active quality link; fall back to `links[0]` (tracks are duplicated per quality).
 */
export function pickLampaSidecarSubtitles(
  links: Array<{ subtitles?: unknown }>,
  activeLink?: { subtitles?: unknown } | null,
): SubtitleTrackInfo[] {
  const fromActive = activeLink ? readSubtitleTracksFromSource(activeLink) : [];
  if (fromActive.length) return fromActive;
  if (links.length) return readSubtitleTracksFromSource(links[0]);
  return [];
}

/** Preference key that survives quality changes for sidecar tracks. */
export function subtitlePreferenceKey(track: SubtitleTrackInfo): string {
  return track.language?.trim() || track.label.trim();
}

export function subtitleTrackLabel(track: SubtitleTrackInfo): string {
  const label = track.label?.trim();
  if (label) return label;
  const name = track.name?.trim();
  if (name) return name;
  const language = track.language?.trim();
  if (language) return language.toUpperCase();
  return 'Субтитры';
}

/**
 * Match saved pref (language code or human label). Empty pref → off (no auto-pick).
 */
export function findPreferredSubtitleTrack(
  tracks: SubtitleTrackInfo[],
  preferredLanguage?: string | null,
): SubtitleTrackInfo | null {
  if (!tracks.length) return null;
  const pref = preferredLanguage?.trim();
  if (!pref) return null;

  const byLang = tracks.find((t) => t.language && labelsEqual(t.language, pref));
  if (byLang) return byLang;

  const byLabel = tracks.find((t) => labelsEqual(t.label, pref));
  if (byLabel) return byLabel;

  return null;
}

/** Merge stream-reported tracks with sidecar; prefer sidecar (has URL for RN overlay). */
export function mergeSubtitleTrackLists(
  external: SubtitleTrackInfo[],
  stream: SubtitleTrackInfo[],
): SubtitleTrackInfo[] {
  if (!external.length) return stream;
  if (!stream.length) return external;
  // Sidecar labels win — Exo may re-report the same tracks without `url`.
  const seen = new Set(external.map((t) => t.label.trim().toLowerCase()));
  const extras = stream.filter((t) => !seen.has(t.label.trim().toLowerCase()));
  return [...external, ...extras];
}

/** Best-effort ISO 639-1 for react-native-video `textTracks.language`. */
export function guessIsoFromLabel(track: SubtitleTrackInfo): string {
  const lang = track.language?.trim().toLowerCase();
  if (lang && /^[a-z]{2}(-[a-z]{2})?$/i.test(lang)) return lang.slice(0, 2);

  const label = track.label.trim().toLowerCase();
  if (
    label.startsWith('рус') ||
    label === 'ru' ||
    label === 'russian' ||
    label === 'rus'
  ) {
    return 'ru';
  }
  if (
    label.startsWith('eng') ||
    label === 'en' ||
    label === 'english' ||
    label === 'англ'
  ) {
    return 'en';
  }
  if (label.startsWith('укр') || label === 'uk' || label === 'ua') return 'uk';
  if (label.startsWith('deu') || label.startsWith('ger') || label === 'de') return 'de';
  if (label.startsWith('fra') || label.startsWith('fre') || label === 'fr') return 'fr';
  if (label.startsWith('spa') || label === 'es' || label.startsWith('исп')) return 'es';
  if (label.startsWith('jpn') || label === 'ja' || label.startsWith('яп')) return 'ja';
  if (label.startsWith('chi') || label === 'zh' || label.startsWith('кит')) return 'zh';
  return 'en';
}
