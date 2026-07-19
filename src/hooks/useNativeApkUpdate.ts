import { useCallback, useEffect, useState } from 'react';

import {
  fetchAppReleaseManifest,
  isBinaryUpdateAvailable,
  openApkDownload,
  pickApkDownloadUrl,
  type AppReleaseManifest,
} from '@/lib/nativeApkUpdate';

export function useNativeApkUpdate() {
  const [manifest, setManifest] = useState<AppReleaseManifest | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (__DEV__) return;
    let cancelled = false;
    void fetchAppReleaseManifest().then((remote) => {
      if (cancelled || !remote) return;
      if (isBinaryUpdateAvailable(remote)) {
        setManifest(remote);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  const download = useCallback(async () => {
    if (!manifest) return;
    const url = pickApkDownloadUrl(manifest);
    if (!url) return;
    setOpening(true);
    try {
      await openApkDownload(url);
    } finally {
      setOpening(false);
    }
  }, [manifest]);

  const downloadUrl = manifest ? pickApkDownloadUrl(manifest) : null;

  return {
    updateReady: Boolean(manifest && downloadUrl && !dismissed),
    manifest,
    opening,
    dismiss,
    download,
  };
}
