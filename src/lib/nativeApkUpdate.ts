import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import { Linking, Platform } from 'react-native';

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

export type BinaryUpdateCheck =
  | { status: 'up_to_date' }
  | { status: 'unavailable' }
  | { status: 'available'; manifest: AppReleaseManifest }
  | { status: 'error'; message: string };

export interface ApkDownloadProgress {
  bytesWritten: number;
  totalBytes: number;
  ratio: number;
  percentLabel: string;
  bytesLabel: string;
}

export const APK_MIME = 'application/vnd.android.package-archive';
export const ACTION_VIEW_APK = 'android.intent.action.VIEW';
export const ACTION_MANAGE_UNKNOWN_APP_SOURCES = 'android.settings.MANAGE_UNKNOWN_APP_SOURCES';
export const FLAG_GRANT_READ_URI_PERMISSION = 1;
export const FLAG_ACTIVITY_NEW_TASK = 0x10000000;

type IntentLauncherModule = typeof import('expo-intent-launcher');
type ApkPromptListener = (manifest: AppReleaseManifest) => void;

let cachedIntentLauncher: IntentLauncherModule | null | undefined;
const promptListeners = new Set<ApkPromptListener>();

function getIntentLauncher(): IntentLauncherModule | null {
  if (cachedIntentLauncher !== undefined) return cachedIntentLauncher;
  try {
    // String literal required so Metro includes the module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedIntentLauncher = require('expo-intent-launcher') as IntentLauncherModule;
  } catch {
    cachedIntentLauncher = null;
  }
  return cachedIntentLauncher;
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

export function getAndroidPackageName(): string {
  return Constants.expoConfig?.android?.package ?? 'ru.taiiok.aniverse.app';
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

export async function checkBinaryUpdate(): Promise<BinaryUpdateCheck> {
  try {
    const remote = await fetchAppReleaseManifest();
    if (!remote) {
      return { status: 'error', message: 'Не удалось проверить обновления' };
    }
    if (!isBinaryUpdateAvailable(remote)) {
      return { status: 'up_to_date' };
    }
    if (!pickApkDownloadUrl(remote)) {
      return { status: 'unavailable' };
    }
    return { status: 'available', manifest: remote };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось проверить обновления';
    return { status: 'error', message };
  }
}

/** Show the global APK update prompt (used from Settings). */
export function presentApkUpdatePrompt(manifest: AppReleaseManifest): void {
  promptListeners.forEach((listener) => listener(manifest));
}

export function subscribeApkUpdatePrompt(listener: ApkPromptListener): () => void {
  promptListeners.add(listener);
  return () => {
    promptListeners.delete(listener);
  };
}

export function apkCacheFileName(versionCode: number): string {
  return `sleek-${versionCode}.apk`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${Math.round(bytes)} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export function formatDownloadProgress(bytesWritten: number, totalBytes: number): ApkDownloadProgress {
  const written = Number.isFinite(bytesWritten) && bytesWritten > 0 ? bytesWritten : 0;
  const total = Number.isFinite(totalBytes) && totalBytes > 0 ? totalBytes : 0;
  const ratio = total > 0 ? Math.min(1, Math.max(0, written / total)) : 0;
  return {
    bytesWritten: written,
    totalBytes: total,
    ratio,
    percentLabel: total > 0 ? `${Math.round(ratio * 100)}%` : '…',
    bytesLabel: total > 0 ? `${formatBytes(written)} / ${formatBytes(total)}` : formatBytes(written),
  };
}

export function buildApkInstallIntent(contentUri: string): {
  data: string;
  type: string;
  flags: number;
} {
  return {
    data: contentUri,
    type: APK_MIME,
    flags: FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK,
  };
}

export function buildUnknownSourcesIntent(packageName: string): { data: string } {
  return { data: `package:${packageName}` };
}

export function isInstallPermissionError(error: unknown): boolean {
  const text = error instanceof Error ? `${error.message} ${error.cause ?? ''}` : String(error);
  return /REQUEST_INSTALL|unknown sources|INSTALL_PACKAGES|Permission Denial|ActivityNotFound|unknown app/i.test(
    text,
  );
}

export async function openApkDownload(url: string): Promise<void> {
  const can = await Linking.canOpenURL(url);
  if (can) {
    await Linking.openURL(url);
  }
}

export async function downloadApkToCache(
  url: string,
  versionCode: number,
  options: {
    onProgress?: (progress: ApkDownloadProgress) => void;
    signal?: AbortSignal;
  } = {},
): Promise<{ contentUri: string }> {
  if (Platform.OS !== 'android') {
    throw new Error('Установка APK доступна только на Android');
  }

  const cacheRoot = FileSystem.cacheDirectory;
  if (!cacheRoot) {
    throw new Error('Файловая система недоступна');
  }

  const dir = `${cacheRoot}updates/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }

  const dest = `${dir}${apkCacheFileName(versionCode)}`;
  await FileSystem.deleteAsync(dest, { idempotent: true });

  const resumable = FileSystem.createDownloadResumable(
    url,
    dest,
    {},
    ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      options.onProgress?.(formatDownloadProgress(totalBytesWritten, totalBytesExpectedToWrite));
    },
  );

  const onAbort = () => {
    void resumable.pauseAsync();
  };
  options.signal?.addEventListener('abort', onAbort);

  const downloadPromise = resumable.downloadAsync();
  try {
    if (options.signal?.aborted) {
      throw abortError();
    }
    const result = options.signal
      ? await Promise.race([downloadPromise, waitForAbort(options.signal)])
      : await downloadPromise;
    if (!result?.uri) {
      throw new Error('Не удалось сохранить APK');
    }
    const contentUri = await FileSystem.getContentUriAsync(result.uri);
    if (!contentUri) {
      throw new Error('Не удалось получить URI для установки');
    }
    return { contentUri };
  } catch (error) {
    if (options.signal?.aborted) {
      throw abortError();
    }
    throw error;
  } finally {
    options.signal?.removeEventListener('abort', onAbort);
    if (options.signal?.aborted) {
      await FileSystem.deleteAsync(dest, { idempotent: true });
    }
  }
}

export async function installDownloadedApk(contentUri: string): Promise<void> {
  if (Platform.OS !== 'android') {
    throw new Error('Установка APK доступна только на Android');
  }

  const IntentLauncher = getIntentLauncher();
  if (!IntentLauncher) {
    throw new Error('Установщик недоступен');
  }

  const params = buildApkInstallIntent(contentUri);
  try {
    await IntentLauncher.startActivityAsync(ACTION_VIEW_APK, params);
  } catch (error) {
    if (!isInstallPermissionError(error)) {
      throw error;
    }
    await openUnknownSourcesSettings();
    await IntentLauncher.startActivityAsync(ACTION_VIEW_APK, params);
  }
}

export async function openUnknownSourcesSettings(): Promise<void> {
  const IntentLauncher = getIntentLauncher();
  if (!IntentLauncher) return;
  try {
    await IntentLauncher.startActivityAsync(
      ACTION_MANAGE_UNKNOWN_APP_SOURCES,
      buildUnknownSourcesIntent(getAndroidPackageName()),
    );
  } catch {
    await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS, {
      data: `package:${getAndroidPackageName()}`,
    });
  }
}

export function canInstallApkInApp(): boolean {
  return Platform.OS === 'android' && Boolean(FileSystem.cacheDirectory) && Boolean(getIntentLauncher());
}

function abortError(): Error {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
}

function waitForAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }
    signal.addEventListener('abort', () => reject(abortError()), { once: true });
  });
}
