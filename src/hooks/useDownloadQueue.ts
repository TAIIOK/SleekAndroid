import { useEffect, useState } from 'react';

import {
  getDownloadService,
  type DownloadRecord,
  type QueueState,
} from '@/services/download';

export function useDownloadQueue() {
  const [state, setState] = useState<QueueState>({ activeId: null, records: [] });

  useEffect(() => {
    const svc = getDownloadService();
    void svc.init();
    return svc.subscribe(setState);
  }, []);

  return state;
}

export function useDownloadRecords(): DownloadRecord[] {
  return useDownloadQueue().records;
}
