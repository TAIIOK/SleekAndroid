import AsyncStorage from '@react-native-async-storage/async-storage';

export type ImageCdnPreference = 'static' | 'imgproxy';

export const IMAGE_CDN_HOSTS = {
  imgproxy: 'https://imgproxy.yani.tv/',
  static: 'https://static.yani.tv/',
} as const;

/** Known public poster used for GET probes (iOS `defaultProbePath` parity). */
export const IMAGE_CDN_PROBE_PATH = '/posters/huge/1636885510.avif';

const IMAGE_CDN_HOST_NAMES: Record<ImageCdnPreference, string> = {
  imgproxy: 'imgproxy.yani.tv',
  static: 'static.yani.tv',
};

const STORAGE_KEY = 'image_cdn_preference';
const STATIC_UNHEALTHY_KEY = 'image_cdn_static_unhealthy';
const PROBE_TIMEOUT_MS = 2500;
const PROBE_TTL_MS = 24 * 60 * 60 * 1000;
const REPROBE_DEBOUNCE_MS = 5_000;
const POSTER_ERROR_THRESHOLD = 5;

interface StoredImageCdn {
  preference: ImageCdnPreference | null;
  probedAt: number;
}

let memoryCache: StoredImageCdn | null = null;
let staticUnhealthy = false;
let consecutiveYaniErrors = 0;
let reprobeInFlight: Promise<ImageCdnPreference | null> | null = null;
let lastReprobeAt = 0;

function isPreference(value: unknown): value is ImageCdnPreference {
  return value === 'static' || value === 'imgproxy';
}

function persistStaticUnhealthyFlag(value: boolean): void {
  staticUnhealthy = value;
  void (async () => {
    try {
      if (value) await AsyncStorage.setItem(STATIC_UNHEALTHY_KEY, '1');
      else await AsyncStorage.removeItem(STATIC_UNHEALTHY_KEY);
    } catch {
      // keep memory flag even if disk write fails
    }
  })();
}

/** Effective preference for `X-Image-CDN` (forces imgproxy when static is unhealthy). */
export function getImageCdnPreferenceSync(): ImageCdnPreference | null {
  if (staticUnhealthy) return 'imgproxy';
  // Default imgproxy so catalog requests always choose a host (iOS rewrite parity).
  return memoryCache?.preference ?? 'imgproxy';
}

export function isStaticCdnUnhealthy(): boolean {
  return staticUnhealthy;
}

export async function loadImageCdnPreference(): Promise<StoredImageCdn> {
  try {
    const unhealthy = await AsyncStorage.getItem(STATIC_UNHEALTHY_KEY);
    staticUnhealthy = unhealthy === '1';
  } catch {
    staticUnhealthy = false;
  }
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      memoryCache = { preference: 'imgproxy', probedAt: 0 };
      return { ...memoryCache };
    }
    const parsed = JSON.parse(raw) as Partial<StoredImageCdn>;
    const storedPref = isPreference(parsed.preference) ? parsed.preference : null;
    // Do not restore sticky `static` across launches — Cloudflare may be down
    // and would poison catalog URLs before the first probe finishes (iOS parity).
    memoryCache = {
      preference: storedPref === 'static' ? null : storedPref,
      probedAt: typeof parsed.probedAt === 'number' ? parsed.probedAt : 0,
    };
    return { ...memoryCache };
  } catch {
    memoryCache = { preference: 'imgproxy', probedAt: 0 };
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

function yaniHostName(url: string): string {
  try {
    return new URL(url.startsWith('//') ? `https:${url}` : url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/** Swap yani poster hostname; leave non-yani URLs unchanged. */
export function rewritePosterURLToHost(url: string, preference: ImageCdnPreference): string {
  const host = yaniHostName(url);
  if (host !== 'imgproxy.yani.tv' && host !== 'static.yani.tv' && host !== 'img.yani.tv') {
    return url;
  }
  const preferredHost = IMAGE_CDN_HOST_NAMES[preference];
  if (host === preferredHost) return url;
  try {
    const absolute = url.startsWith('//') ? `https:${url}` : url;
    const parsed = new URL(absolute);
    parsed.hostname = preferredHost;
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Rewrite yani poster hosts to the preferred CDN for display.
 * Unknown preference → imgproxy. staticUnhealthy → imgproxy.
 */
export function rewritePosterURL(url: string): string {
  const preference: ImageCdnPreference =
    staticUnhealthy || memoryCache?.preference !== 'static' ? 'imgproxy' : 'static';
  return rewritePosterURLToHost(url, preference);
}

export function markStaticUnhealthyAndPreferImgproxy(): void {
  persistStaticUnhealthyFlag(true);
  consecutiveYaniErrors = 0;
  memoryCache = {
    preference: 'imgproxy',
    probedAt: memoryCache?.probedAt ?? Date.now(),
  };
  void (async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache));
    } catch {
      // ignore
    }
  })();
  void reprobeImageCdn('static_unhealthy');
}

type ProbeFetch = typeof fetch;

export interface ProbeHostResult {
  host: ImageCdnPreference;
  ok: boolean;
  ms: number;
}

function probeUrlFor(host: ImageCdnPreference): string {
  return `${IMAGE_CDN_HOSTS[host].replace(/\/$/, '')}${IMAGE_CDN_PROBE_PATH}`;
}

function responseHost(res: Response, fallbackUrl: string): string {
  try {
    return new URL(res.url || fallbackUrl).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * GET a real poster (Range) — Android TV often fails HEAD on the domain root.
 * 2xx = reachable; other HTTP / network / TLS / timeout = down.
 * `static` that 302s onto imgproxy is not a real static win (iOS parity).
 */
export async function probeHost(
  host: ImageCdnPreference,
  fetchImpl: ProbeFetch = fetch,
  timeoutMs = PROBE_TIMEOUT_MS,
): Promise<ProbeHostResult> {
  const url = probeUrlFor(host);
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'image/*,*/*;q=0.8',
        Range: 'bytes=0-2047',
      },
    });
    if (res.status < 200 || res.status >= 300) {
      return { host, ok: false, ms: Date.now() - started };
    }
    const finalHost = responseHost(res, url);
    if (host === 'static' && finalHost && finalHost !== IMAGE_CDN_HOST_NAMES.static) {
      return { host, ok: false, ms: Date.now() - started };
    }
    return { host, ok: true, ms: Date.now() - started };
  } catch {
    return { host, ok: false, ms: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

export function pickImageCdnPreference(
  results: readonly ProbeHostResult[],
  options: { staticAllowed?: boolean } = {},
): ImageCdnPreference | null {
  const staticAllowed = options.staticAllowed !== false;
  const up = results.filter((r) => {
    if (!r.ok) return false;
    if (r.host === 'static' && !staticAllowed) return false;
    return true;
  });
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
  return pickImageCdnPreference(results, { staticAllowed: !staticUnhealthy });
}

export async function ensureImageCdnPreference(
  options: { force?: boolean; fetchImpl?: ProbeFetch } = {},
): Promise<ImageCdnPreference | null> {
  // Always hydrate sync getter from disk before early API calls.
  const stored = await loadImageCdnPreference();
  if (memoryCache?.preference == null) {
    memoryCache = { preference: 'imgproxy', probedAt: stored.probedAt };
  }
  const fresh =
    !options.force &&
    stored.probedAt > 0 &&
    stored.preference === 'imgproxy' &&
    Date.now() - stored.probedAt < PROBE_TTL_MS;

  if (fresh) {
    return getImageCdnPreferenceSync();
  }

  const preference = await probeImageCdns(options.fetchImpl);
  if (preference === 'static') {
    persistStaticUnhealthyFlag(false);
  }
  if (preference) {
    await saveImageCdnPreference(preference);
  } else {
    memoryCache = {
      preference: 'imgproxy',
      probedAt: Date.now(),
    };
  }
  return getImageCdnPreferenceSync();
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
  const host = yaniHostName(url ?? '');
  if (host === 'static.yani.tv' || host === 'img.yani.tv') {
    markStaticUnhealthyAndPreferImgproxy();
    return;
  }
  consecutiveYaniErrors += 1;
  if (consecutiveYaniErrors < POSTER_ERROR_THRESHOLD) return;
  consecutiveYaniErrors = 0;
  void reprobeImageCdn('poster_errors');
}

/** Test helper — reset module state between cases. */
export function __resetImageCdnForTests(): void {
  memoryCache = null;
  staticUnhealthy = false;
  consecutiveYaniErrors = 0;
  reprobeInFlight = null;
  lastReprobeAt = 0;
}
