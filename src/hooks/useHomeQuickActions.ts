import { useCallback, useEffect, useState } from 'react';

import {
  DEFAULT_HOME_QUICK_ACTION_IDS,
  loadHomeQuickActions,
  saveHomeQuickActions,
  subscribeHomeQuickActions,
  type HomeQuickActionId,
} from '@/lib/homeQuickActions';

export function useHomeQuickActions() {
  const [ids, setIds] = useState<HomeQuickActionId[]>(DEFAULT_HOME_QUICK_ACTION_IDS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void loadHomeQuickActions().then((next) => {
      setIds(next);
      setReady(true);
    });
    return subscribeHomeQuickActions(() => {
      void loadHomeQuickActions().then(setIds);
    });
  }, []);

  const persist = useCallback(async (next: HomeQuickActionId[]) => {
    await saveHomeQuickActions(next);
    setIds(next);
  }, []);

  return { ids, persist, ready };
}
