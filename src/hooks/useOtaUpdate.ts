import * as Updates from 'expo-updates';
import { useCallback, useEffect, useRef, useState } from 'react';

import { checkAndFetchOtaUpdate, isOtaEnabled, reloadWithOtaUpdate } from '@/lib/otaUpdates';

export function useOtaUpdate() {
  const { isUpdatePending } = Updates.useUpdates();
  const [dismissed, setDismissed] = useState(false);
  const [reloading, setReloading] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !isOtaEnabled()) return;
    started.current = true;
    void checkAndFetchOtaUpdate();
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  const reload = useCallback(async () => {
    setReloading(true);
    try {
      await reloadWithOtaUpdate();
    } catch {
      setReloading(false);
    }
  }, []);

  return {
    updateReady: isUpdatePending && !dismissed,
    reloading,
    dismiss,
    reload,
  };
}
