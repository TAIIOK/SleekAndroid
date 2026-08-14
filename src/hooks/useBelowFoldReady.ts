import { useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';

/**
 * Becomes true after the current interactions (hero paint) finish.
 * Gate below-fold detail queries so they do not contend with the first frame.
 */
export function useBelowFoldReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        setReady(true);
      });
    });
    return () => handle.cancel();
  }, []);

  return ready;
}
