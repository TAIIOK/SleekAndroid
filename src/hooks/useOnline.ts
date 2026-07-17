import { useEffect, useState } from 'react';

/** Online status hook — uses fetch probe (no extra native deps). */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        await fetch('https://api.taiiok.ru/api/catalog', {
          method: 'HEAD',
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!cancelled) setOnline(true);
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
