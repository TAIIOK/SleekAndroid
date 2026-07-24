import {
  refreshAnimePosters,
  RefreshPostersRateLimitedError,
} from '@/api/catalog';
import { getImageCdnPreferenceSync } from '@/lib/imageCdn';
import {
  isPlausibleImageURL,
  normalizedAbsoluteURLString,
  pickFromPosterImages,
} from '@/lib/poster';
import { queryClient } from '@/providers/QueryProvider';

export type AnimePosterDeadReason =
  | 'unresolvedOrImplausibleURL'
  | 'preferredHostFailure';

export interface AnimePosterRefreshEvent {
  animeId: number;
  posterURLString: string;
}

type Listener = (event: AnimePosterRefreshEvent) => void;

const listeners = new Set<Listener>();
const inFlightAnimeIds = new Set<number>();
const cooldownUntilByAnimeId = new Map<number, number>();
let globalPauseUntil = 0;

const IMAGE_CDN_HOST_NAMES: Record<'static' | 'imgproxy', string> = {
  static: 'static.yani.tv',
  imgproxy: 'imgproxy.yani.tv',
};

function preferredHostName(): string {
  const preference = getImageCdnPreferenceSync();
  if (preference === 'static' || preference === 'imgproxy') {
    return IMAGE_CDN_HOST_NAMES[preference];
  }
  return IMAGE_CDN_HOST_NAMES.imgproxy;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url.startsWith('//') ? `https:${url}` : url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Whether a load / resolution failure should trigger backend refresh.
 * RN Image onError has no HTTP status — treat preferred/imgproxy failures as content dead.
 * static/img.yani.tv failures are left to CDN reprobe (connectivity blips).
 */
export function isReallyDeadPoster(options: {
  failedUrl?: string | null;
  rawPath?: string | null;
  preferredHostName?: string | null;
}): AnimePosterDeadReason | null {
  const preferred = (options.preferredHostName ?? preferredHostName()).toLowerCase();

  if (options.rawPath) {
    const trimmed = options.rawPath.trim();
    if (trimmed) {
      const normalized = normalizedAbsoluteURLString(trimmed) ?? trimmed;
      const isAbsolute =
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('//');
      if (isAbsolute && !isPlausibleImageURL(normalized)) {
        return 'unresolvedOrImplausibleURL';
      }
    }
  }

  if (!options.failedUrl) {
    if (options.rawPath?.trim()) return 'unresolvedOrImplausibleURL';
    return null;
  }

  const failed = normalizedAbsoluteURLString(options.failedUrl) ?? options.failedUrl;
  if (!isPlausibleImageURL(failed)) {
    return 'unresolvedOrImplausibleURL';
  }

  const host = hostnameOf(failed);
  if (host === 'static.yani.tv' || host === 'img.yani.tv') {
    // Connectivity on Cloudflare static is handled by imageCdn reprobe.
    return null;
  }

  if (host === preferred || host === 'imgproxy.yani.tv') {
    return 'preferredHostFailure';
  }

  return null;
}

export function subscribeAnimePosterRefresh(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitRefresh(event: AnimePosterRefreshEvent): void {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // ignore subscriber errors
    }
  }
}

function applyCooldown(animeId: number, retryAfterSeconds: number, force: boolean): void {
  const seconds = force ? Math.max(1, retryAfterSeconds) : Math.max(0, retryAfterSeconds);
  if (seconds <= 0) return;
  cooldownUntilByAnimeId.set(animeId, Date.now() + seconds * 1000);
}

async function refreshIfAllowed(animeId: number): Promise<void> {
  if (!Number.isFinite(animeId) || animeId <= 0) return;

  const now = Date.now();
  if (globalPauseUntil > now) return;
  const cooldownUntil = cooldownUntilByAnimeId.get(animeId) ?? 0;
  if (cooldownUntil > now) return;
  if (inFlightAnimeIds.has(animeId)) return;

  inFlightAnimeIds.add(animeId);
  try {
    const result = await refreshAnimePosters(animeId);
    applyCooldown(animeId, result.retryAfterSeconds, result.cooldown);

    const poster = pickFromPosterImages(result.posters);
    if (poster) {
      emitRefresh({ animeId, posterURLString: poster });
    }

    if (result.animeUpdated || result.deletedCount > 0 || poster) {
      void queryClient.invalidateQueries({ queryKey: ['anime', animeId] });
    }
  } catch (error) {
    if (error instanceof RefreshPostersRateLimitedError) {
      globalPauseUntil = Date.now() + Math.max(1, error.retryAfterSeconds) * 1000;
      return;
    }
    // Soft backoff so a flapping card does not hammer 5xx.
    cooldownUntilByAnimeId.set(animeId, Date.now() + 30_000);
  } finally {
    inFlightAnimeIds.delete(animeId);
  }
}

/** Report a dead poster if it looks like a real content failure (not CDN blip). */
export function reportDeadPoster(options: {
  animeId?: number | null;
  failedUrl?: string | null;
  rawPath?: string | null;
}): void {
  const animeId = options.animeId;
  if (animeId == null || !Number.isFinite(animeId) || animeId <= 0) return;

  if (
    isReallyDeadPoster({
      failedUrl: options.failedUrl,
      rawPath: options.rawPath,
      preferredHostName: preferredHostName(),
    }) == null
  ) {
    return;
  }

  void refreshIfAllowed(animeId);
}

/** Test helper — reset module state between cases. */
export function __resetAnimePosterRefreshForTests(): void {
  listeners.clear();
  inFlightAnimeIds.clear();
  cooldownUntilByAnimeId.clear();
  globalPauseUntil = 0;
}
