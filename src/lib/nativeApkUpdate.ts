import Constants from 'expo-constants';
import { Linking } from 'react-native';

import { SITE_PUBLIC_URL } from '@/lib/config';
import { isTvUi } from '@/lib/isTvUi';

export interface AppReleaseManifest {
  versionName: string;
  versionCode: number;
  phoneApkUrl: string;
  tvApkUrl: string;
  /** @deprecated Prefer phoneApkUrl — legacy universal APK field. */
  apkUrl?: string;
  releasedAt?: string;
  changelog?: string;
}

export function getReleasesUrl(): string {
  const fromExtra = (Constants.expoConfig?.extra as { releasesUrl?: string } | undefined)?.releasesUrl;
  if (fromExtra && typeof fromExtra === 'string' && fromExtra.trim()) {
    return fromExtra.trim();
  }
  const base = SITE_PUBLIC_URL.replace(/\/$/, '');
  return `${base}/releases/latest.json`;
}

export function getLocalVersionCode(): number {
  const build = Constants.nativeBuildVersion;
  const parsed = Number(build);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  const fromConfig = Constants.expoConfig?.android?.versionCode;
  if (typeof fromConfig === 'number' && fromConfig > 0) return fromConfig;
  return 0;
}

export function getLocalVersionName(): string {
  return Constants.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '0.0.0';
}

/** Compare dotted version names (e.g. 1.0.3); returns >0 if a is newer than b. */
export function compareVersionNames(a: string, b: string): number {
  const parse = (v: string) =>
    v
      .split(/[.+-]/)
      .filter(Boolean)
      .map((part) => {
        const n = Number.parseInt(part, 10);
        return Number.isFinite(n) ? n : 0;
      });
  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

export async function fetchAppReleaseManifest(): Promise<AppReleaseManifest | null> {
  try {
    const res = await fetch(getReleasesUrl(), { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<AppReleaseManifest>;
    if (typeof data.versionName !== 'string' || typeof data.versionCode !== 'number') {
      return null;
    }
    const phoneApkUrl =
      (typeof data.phoneApkUrl === 'string' && data.phoneApkUrl) ||
      (typeof data.apkUrl === 'string' && data.apkUrl) ||
      '';
    return {
      versionName: data.versionName,
      versionCode: data.versionCode,
      phoneApkUrl,
      tvApkUrl: typeof data.tvApkUrl === 'string' ? data.tvApkUrl : '',
      apkUrl: typeof data.apkUrl === 'string' ? data.apkUrl : '',
      releasedAt: data.releasedAt,
      changelog: data.changelog,
    };
  } catch {
    return null;
  }
}

export function isBinaryUpdateAvailable(manifest: AppReleaseManifest): boolean {
  // Never offer a same/older release by name (guards stale CDN + mismatched versionCode).
  if (compareVersionNames(manifest.versionName, getLocalVersionName()) <= 0) {
    return false;
  }
  const localCode = getLocalVersionCode();
  if (localCode > 0) {
    return manifest.versionCode > localCode;
  }
  return true;
}

export function pickApkDownloadUrl(manifest: AppReleaseManifest): string | null {
  const tv = manifest.tvApkUrl?.trim();
  const phone = manifest.phoneApkUrl?.trim();
  if (isTvUi()) return tv || phone || null;
  return phone || tv || null;
}

export async function openApkDownload(url: string): Promise<void> {
  const can = await Linking.canOpenURL(url);
  if (can) {
    await Linking.openURL(url);
  }
}
