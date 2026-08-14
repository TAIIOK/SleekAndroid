import { fromByteArray } from 'base64-js';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { needsHotlinkReferer } from '@/lib/config';

/** Canonical Anilib origin — cover.imglib.info requires a non-empty Referer. */
export const HOTLINK_REFERER = 'https://anilib.me/';

const fetchBlockedHosts = new Set<string>();

function hostOf(uri: string): string {
  try {
    return new URL(uri.startsWith('//') ? `https:${uri}` : uri).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function isSslFailure(error: unknown): boolean {
  const text = error instanceof Error ? `${error.message} ${error.cause ?? ''}` : String(error);
  return /SSLHandshakeException|Chain validation failed|CertPathValidatorException|certificate/i.test(
    text,
  );
}

export function hotlinkRequestHeaders(): Record<string, string> {
  return {
    Referer: HOTLINK_REFERER,
    'User-Agent':
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
    Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
  };
}

/** expo-image / RN Image source with hotlink headers when needed. */
export function hotlinkImageSource(uri: string): {
  uri: string;
  headers?: Record<string, string>;
  cacheKey?: string;
} {
  if (!needsHotlinkReferer(uri) || Platform.OS === 'web') {
    return { uri };
  }
  return {
    uri,
    cacheKey: `hotlink:hdr:v1:${uri}`,
    headers: hotlinkRequestHeaders(),
  };
}

function cacheFileFor(uri: string): string | null {
  const root = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!root) return null;
  let hash = 0;
  for (let i = 0; i < uri.length; i += 1) {
    hash = (hash * 31 + uri.charCodeAt(i)) >>> 0;
  }
  return `${root}hotlink-v5/${hash.toString(16)}.jpg`;
}

/**
 * Fetch poster bytes via RN `fetch` (OkHttp + Gen-Y trust) and persist to a local file.
 * Hotlink CDNs get Referer. Hosts that fail TLS (imgproxy on some TV boxes) are skipped
 * after the first failure so Metro is not spammed per poster.
 */
export async function prefetchPosterDisplayUri(
  remoteUri: string | null | undefined,
): Promise<string | null> {
  if (!remoteUri?.trim()) return null;
  const uri = remoteUri.trim();
  if (Platform.OS === 'web') return uri;

  const host = hostOf(uri);
  if (host && fetchBlockedHosts.has(host)) return null;

  const dest = cacheFileFor(uri);
  if (dest) {
    try {
      const dir = dest.slice(0, dest.lastIndexOf('/') + 1);
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }
      const existing = await FileSystem.getInfoAsync(dest);
      if (existing.exists && 'size' in existing && Number(existing.size) > 512) {
        return dest;
      }
    } catch {
      // continue
    }
  }

  try {
    const headers = needsHotlinkReferer(uri) ? hotlinkRequestHeaders() : undefined;
    const response = await fetch(uri, headers ? { headers } : undefined);
    if (!response.ok) return null;
    const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
    if (contentType.includes('text/html')) return null;

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength < 512) return null;
    const base64 = fromByteArray(new Uint8Array(buffer));

    if (dest) {
      try {
        await FileSystem.writeAsStringAsync(dest, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return dest;
      } catch {
        // fall through to data URI
      }
    }

    const mime = contentType.startsWith('image/') ? contentType.split(';')[0]! : 'image/jpeg';
    return `data:${mime};base64,${base64}`;
  } catch (error) {
    if (host && isSslFailure(error)) fetchBlockedHosts.add(host);
    return null;
  }
}

/**
 * Prefetch hotlink CDN bytes via RN `fetch` (OkHttp + Gen-Y trust + Referer),
 * then persist to a local file for reliable Image display.
 */
export async function resolveHotlinkDisplayUri(
  remoteUri: string | null | undefined,
): Promise<string | null> {
  if (!remoteUri?.trim()) return null;
  const uri = remoteUri.trim();
  if (!needsHotlinkReferer(uri) || Platform.OS === 'web') return uri;
  return prefetchPosterDisplayUri(uri);
}

/** Test helper — reset blocked-host memory between cases. */
export function __resetHotlinkImageForTests(): void {
  fetchBlockedHosts.clear();
}
