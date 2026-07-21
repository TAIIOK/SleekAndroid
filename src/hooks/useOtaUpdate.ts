import { useCallback, useEffect, useRef, useState } from 'react';

import {
  checkAndFetchOtaUpdate,
  getUpdatesModule,
  isOtaEnabled,
  reloadWithOtaUpdate,
} from '@/lib/otaUpdates';

/**
 * Isolated so `expo-updates` hooks are only called when the native module loaded.
 * Parent must not mount this when `getUpdatesModule()` is null.
 */
/** Only mount from a parent that verified `getUpdatesModule()` is non-null. */
export function useOtaUpdate() {
  const Updates = getUpdatesModule()!;
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
