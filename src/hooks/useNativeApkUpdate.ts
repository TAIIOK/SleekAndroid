import { useCallback, useEffect, useRef, useState } from 'react';

import {
  canInstallApkInApp,
  downloadApkToCache,
  fetchAppReleaseManifest,
  installDownloadedApk,
  isBinaryUpdateAvailable,
  openApkDownload,
  pickApkDownloadUrl,
  subscribeApkUpdatePrompt,
  type AppReleaseManifest,
  type ApkDownloadProgress,
} from '@/lib/nativeApkUpdate';

export type NativeApkUpdatePhase = 'idle' | 'downloading' | 'installing' | 'error';

function isAbortError(error: unknown): boolean {
  if (typeof error === 'object' && error && 'name' in error && (error as { name: string }).name === 'AbortError') {
    return true;
  }
  const text = error instanceof Error ? error.message : String(error);
  return /aborted|AbortError/i.test(text);
}

export function useNativeApkUpdate() {
  const [manifest, setManifest] = useState<AppReleaseManifest | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [phase, setPhase] = useState<NativeApkUpdatePhase>('idle');
  const [progress, setProgress] = useState<ApkDownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cachedContentUri, setCachedContentUri] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const showManifest = useCallback((remote: AppReleaseManifest) => {
    setManifest(remote);
    setDismissed(false);
    setPhase('idle');
    setError(null);
    setProgress(null);
    setCachedContentUri(null);
  }, []);

  useEffect(() => {
    return subscribeApkUpdatePrompt(showManifest);
  }, [showManifest]);

  useEffect(() => {
    if (__DEV__) return;
    let cancelled = false;
    void fetchAppReleaseManifest().then((remote) => {
      if (cancelled || !remote) return;
      if (isBinaryUpdateAvailable(remote) && pickApkDownloadUrl(remote)) {
        setManifest(remote);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const dismiss = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setDismissed(true);
    setPhase('idle');
  }, []);

  const download = useCallback(async () => {
    if (!manifest) return;
    const url = pickApkDownloadUrl(manifest);
    if (!url) return;

    if (!canInstallApkInApp()) {
      setPhase('installing');
      try {
        await openApkDownload(url);
        setPhase('idle');
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Не удалось открыть загрузку');
        setPhase('error');
      }
      return;
    }

    setError(null);
    try {
      let contentUri = cachedContentUri;
      if (!contentUri) {
        const controller = new AbortController();
        abortRef.current = controller;
        setPhase('downloading');
        setProgress(null);
        const downloaded = await downloadApkToCache(url, manifest.versionCode, {
          signal: controller.signal,
          onProgress: setProgress,
        });
        contentUri = downloaded.contentUri;
        setCachedContentUri(contentUri);
      }

      setPhase('installing');
      await installDownloadedApk(contentUri);
      setPhase('idle');
    } catch (caught) {
      if (isAbortError(caught)) {
        setPhase('idle');
        return;
      }
      const message = caught instanceof Error ? caught.message : 'Не удалось установить обновление';
      setError(message);
      setPhase('error');
    } finally {
      abortRef.current = null;
    }
  }, [cachedContentUri, manifest]);

  const openInBrowser = useCallback(async () => {
    if (!manifest) return;
    const url = pickApkDownloadUrl(manifest);
    if (!url) return;
    await openApkDownload(url);
  }, [manifest]);

  const downloadUrl = manifest ? pickApkDownloadUrl(manifest) : null;

  return {
    updateReady: Boolean(manifest && downloadUrl && !dismissed),
    manifest,
    phase,
    progress,
    error,
    cached: Boolean(cachedContentUri),
    dismiss,
    download,
    openInBrowser,
  };
}
