import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { queryClient } from '@/providers/QueryProvider';

const PROGRESS_QUERY_KEYS = [
  ['anime-progress'],
  ['lampa-progress'],
  ['library-anime'],
  ['library-lampa'],
  ['history-feed'],
] as const;

function invalidateProgressQueries(): void {
  for (const queryKey of PROGRESS_QUERY_KEYS) {
    void queryClient.invalidateQueries({ queryKey });
  }
}

/**
 * Refetch continue-watching sources when returning to Home or the app becomes active
 * so TV picks up progress written on phone/web.
 */
export function useRefreshProgressOnResume(): void {
  const appStateRef = useRef(AppState.currentState);

  useFocusEffect(
    useCallback(() => {
      invalidateProgressQueries();
    }, []),
  );

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      const wasBackground =
        appStateRef.current === 'background' || appStateRef.current === 'inactive';
      appStateRef.current = state;
      if (wasBackground && state === 'active') {
        invalidateProgressQueries();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);
}
