import Constants from 'expo-constants';
import { Linking } from 'react-native';

import { SITE_PUBLIC_URL } from '@/lib/config';
import { isTvUi } from '@/lib/isTvUi';

export interface AppReleaseManifest {
  versionName: string;
  versionCode: number;
  phoneApkUrl: string;
  tvApkUrl: string;
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
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getLocalVersionName(): string {
  return Constants.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '0.0.0';
}

export async function fetchAppReleaseManifest(): Promise<AppReleaseManifest | null> {
  try {
    const res = await fetch(getReleasesUrl(), { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<AppReleaseManifest>;
    if (typeof data.versionName !== 'string' || typeof data.versionCode !== 'number') {
      return null;
    }
    return {
      versionName: data.versionName,
      versionCode: data.versionCode,
      phoneApkUrl: typeof data.phoneApkUrl === 'string' ? data.phoneApkUrl : '',
      tvApkUrl: typeof data.tvApkUrl === 'string' ? data.tvApkUrl : '',
      releasedAt: data.releasedAt,
      changelog: data.changelog,
    };
  } catch {
    return null;
  }
}

export function isBinaryUpdateAvailable(manifest: AppReleaseManifest): boolean {
  return manifest.versionCode > getLocalVersionCode();
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
