import { useEffect, useState } from 'react';

/**
 * False on the first paint, true on the next frame.
 * Lets above-the-fold catalog rails commit before below-fold placeholders.
 * Do not use InteractionManager — it can hang across stack/tab transitions.
 */
export function useDeferredMount(enabled = true): boolean {
  const [ready, setReady] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setReady(true);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      requestAnimationFrame(() => {
        if (!cancelled) setReady(true);
      });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled]);

  return ready;
}
