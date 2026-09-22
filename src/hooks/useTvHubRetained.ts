import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSyncExternalStore } from 'react';

import { isTvHubRetained, noteTvHub, subscribeTvHubRetention } from '@/lib/tvHubRetention';

/** TV keeps the focused hub and the previous one. Phone always retains. */
export function useTvHubRetained(path: string): boolean {
  const retained = useSyncExternalStore(
    subscribeTvHubRetention,
    () => isTvHubRetained(path),
    () => true,
  );

  useFocusEffect(
    useCallback(() => {
      noteTvHub(path);
    }, [path]),
  );

  return retained;
}
