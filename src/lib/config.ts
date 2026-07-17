import Constants from 'expo-constants';

import { extractPosterPath } from '@/lib/poster';

type AppExtra = {
  apiUrl?: string;
  watchHubUrl?: string;
  sitePublicUrl?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as AppExtra;

export const API_BASE = (extra.apiUrl ?? 'https://api.taiiok.ru').replace(/\/$/, '');
export const WATCHHUB_BASE = (extra.watchHubUrl ?? 'https://watchhub.taiiok.ru').replace(/\/$/, '');
export const SITE_PUBLIC_URL = (extra.sitePublicUrl ?? 'https://preview.taiiok.ru').replace(/\/$/, '');

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

export function watchHubUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${WATCHHUB_BASE}${p}`;
}

export type LampaPosterSize = 'w185' | 'w342' | 'w500' | 'w700' | 'w780' | 'original';

export function resolveLampaPosterUrl(
  path: string | null | undefined,
  size: LampaPosterSize = 'w342',
): string | undefined {
  if (!path || typeof path !== 'string') return undefined;
  const trimmed = path.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  const clean = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return watchHubUrl(`/tmdb/img/t/p/${size}${clean}`);
}

/** Anime CDN/API paths (not TMDB). Mirrors site `posterUrl`. */
export function resolveAnimePosterUrl(path?: string | null): string | undefined {
  if (!path || typeof path !== 'string') return undefined;
  const trimmed = path.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  const withoutLeadingSlash = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
  if (/^[\w.-]+\.[a-z]{2,}\//i.test(withoutLeadingSlash)) {
    return `https://${withoutLeadingSlash}`;
  }
  return `${API_BASE}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}

function isAnimeRelativePath(path: string): boolean {
  const lower = path.toLowerCase();
  if (
    lower.includes('storage') ||
    lower.includes('upload') ||
    lower.includes('/animes') ||
    lower.includes('/anime/') ||
    lower.includes('/media/')
  ) {
    return true;
  }
  // Multi-segment API paths vs TMDB single-hash filenames (`/xxYYzz.jpg`)
  const segments = path.split('/').filter(Boolean);
  return segments.length >= 2 && !/^\/?[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(path);
}

/**
 * Shared poster resolver used by PosterCard.
 * TMDB (Lampa) paths → WatchHub; anime storage paths → API host.
 */
export function resolvePosterUrl(poster?: unknown): string | undefined {
  const path = extractPosterPath(poster);
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('//')) return `https:${path}`;
  if (isAnimeRelativePath(path)) return resolveAnimePosterUrl(path);
  return resolveLampaPosterUrl(path);
}
