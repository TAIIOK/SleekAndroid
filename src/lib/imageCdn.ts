import AsyncStorage from '@react-native-async-storage/async-storage';

export type ImageCdnPreference = 'static' | 'imgproxy';

export const IMAGE_CDN_HOSTS = {
  imgproxy: 'https://imgproxy.yani.tv/',
  static: 'https://static.yani.tv/',
} as const;

const STORAGE_KEY = 'image_cdn_preference';
const PROBE_TIMEOUT_MS = 2500;
const PROBE_TTL_MS = 24 * 60 * 60 * 1000;
const REPROBE_DEBOUNCE_MS = 5_000;
const POSTER_ERROR_THRESHOLD = 5;

interface StoredImageCdn {
  preference: ImageCdnPreference | null;
  probedAt: number;
}

let memoryCache: StoredImageCdn | null = null;
let consecutiveYaniErrors = 0;
let reprobeInFlight: Promise<ImageCdnPreference | null> | null = null;
let lastReprobeAt = 0;

function isPreference(value: unknown): value is ImageCdnPreference {
  return value === 'static' || value === 'imgproxy';
}

export function getImageCdnPreferenceSync(): ImageCdnPreference | null {
  return memoryCache?.preference ?? null;
}

export async function loadImageCdnPreference(): Promise<StoredImageCdn> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      memoryCache = { preference: null, probedAt: 0 };
      return { ...memoryCache };
    }
    const parsed = JSON.parse(raw) as Partial<StoredImageCdn>;
    memoryCache = {
      preference: isPreference(parsed.preference) ? parsed.preference : null,
      probedAt: typeof parsed.probedAt === 'number' ? parsed.probedAt : 0,
    };
    return { ...memoryCache };
  } catch {
    memoryCache = { preference: null, probedAt: 0 };
    return { ...memoryCache };
  }
}

async function saveImageCdnPreference(
  preference: ImageCdnPreference | null,
  probedAt = Date.now(),
): Promise<StoredImageCdn> {
  const next: StoredImageCdn = { preference, probedAt };
  memoryCache = next;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // keep memory cache even if disk write fails
  }
  return { ...next };
}

export function isYaniPosterUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url.startsWith('//') ? `https:${url}` : url).hostname.toLowerCase();
    return (
      host === 'imgproxy.yani.tv' ||
      host === 'static.yani.tv' ||
      host === 'img.yani.tv'
    );
  } catch {
    return /yani\.tv/i.test(url);
  }
}

type ProbeFetch = typeof fetch;

export interface ProbeHostResult {
  host: ImageCdnPreference;
  ok: boolean;
  ms: number;
}

/** Any HTTP response (incl. 403) = reachable; network/TLS/timeout = down. */
export async function probeHost(
  host: ImageCdnPreference,
  fetchImpl: ProbeFetch = fetch,
  timeoutMs = PROBE_TIMEOUT_MS,
): Promise<ProbeHostResult> {
  const url = IMAGE_CDN_HOSTS[host];
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetchImpl(url, { method: 'HEAD', signal: controller.signal });
    return { host, ok: true, ms: Date.now() - started };
  } catch {
    return { host, ok: false, ms: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

export function pickImageCdnPreference(
  results: readonly ProbeHostResult[],
): ImageCdnPreference | null {
  const up = results.filter((r) => r.ok);
  if (up.length === 0) return null;
  if (up.length === 1) return up[0].host;

  const sorted = [...up].sort((a, b) => {
    if (a.ms !== b.ms) return a.ms - b.ms;
    // Tie → prefer imgproxy (RU-oriented app)
    if (a.host === 'imgproxy') return -1;
    if (b.host === 'imgproxy') return 1;
    return 0;
  });
  return sorted[0].host;
}

export async function probeImageCdns(
  fetchImpl: ProbeFetch = fetch,
): Promise<ImageCdnPreference | null> {
  const results = await Promise.all([
    probeHost('imgproxy', fetchImpl),
    probeHost('static', fetchImpl),
  ]);
  return pickImageCdnPreference(results);
}

export async function ensureImageCdnPreference(
  options: { force?: boolean; fetchImpl?: ProbeFetch } = {},
): Promise<ImageCdnPreference | null> {
  // Always hydrate sync getter from disk before early API calls.
  const stored = await loadImageCdnPreference();
  const fresh =
    !options.force &&
    stored.probedAt > 0 &&
    Date.now() - stored.probedAt < PROBE_TTL_MS;

  if (fresh) {
    return stored.preference;
  }

  const preference = await probeImageCdns(options.fetchImpl);
  await saveImageCdnPreference(preference);
  return preference;
}

export async function reprobeImageCdn(
  _reason?: string,
  options: { fetchImpl?: ProbeFetch } = {},
): Promise<ImageCdnPreference | null> {
  const now = Date.now();
  if (reprobeInFlight) return reprobeInFlight;
  if (now - lastReprobeAt < REPROBE_DEBOUNCE_MS) {
    return getImageCdnPreferenceSync();
  }
  lastReprobeAt = now;
  reprobeInFlight = ensureImageCdnPreference({ force: true, fetchImpl: options.fetchImpl }).finally(
    () => {
      reprobeInFlight = null;
    },
  );
  return reprobeInFlight;
}

export function reportYaniPosterLoadSuccess(): void {
  consecutiveYaniErrors = 0;
}

export function reportYaniPosterLoadError(url?: string | null): void {
  if (!isYaniPosterUrl(url)) return;
  consecutiveYaniErrors += 1;
  if (consecutiveYaniErrors < POSTER_ERROR_THRESHOLD) return;
  consecutiveYaniErrors = 0;
  void reprobeImageCdn('poster_errors');
}

/** Test helper — reset module state between cases. */
export function __resetImageCdnForTests(): void {
  memoryCache = null;
  consecutiveYaniErrors = 0;
  reprobeInFlight = null;
  lastReprobeAt = 0;
}
