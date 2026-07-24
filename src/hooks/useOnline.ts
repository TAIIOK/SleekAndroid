import { useEffect, useState } from 'react';

import { API_BASE } from '@/lib/config';
import { flushProgressQueue } from '@/lib/progressQueue';

/** Online status hook — uses fetch probe against configured API (no NetInfo dep). */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        await fetch(`${API_BASE}/api/catalog`, {
          method: 'HEAD',
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!cancelled) {
          setOnline(true);
          void flushProgressQueue();
        }
      } catch {
        if (!cancelled) setOnline(false);
      }
    };

    void check();
    const id = setInterval(() => void check(), 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return online;
}
