import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/** Milliseconds remaining until `targetMs`. Ticks every second while the app is active. */
export function useCountdown(targetMs: number | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  const remaining = targetMs == null ? 0 : Math.max(0, targetMs - now);

  useEffect(() => {
    if (targetMs == null) return;

    const tick = () => setNow(Date.now());
    tick();

    if (targetMs <= Date.now()) return;

    let intervalId: ReturnType<typeof setInterval> | undefined;

    const start = () => {
      if (intervalId != null) return;
      intervalId = setInterval(() => {
        const t = Date.now();
        setNow(t);
        if (t >= targetMs && intervalId != null) {
          clearInterval(intervalId);
          intervalId = undefined;
        }
      }, 1000);
    };

    const stop = () => {
      if (intervalId == null) return;
      clearInterval(intervalId);
      intervalId = undefined;
    };

    const onChange = (state: AppStateStatus) => {
      if (state !== 'active') {
        stop();
        return;
      }
      tick();
      if (Date.now() < targetMs) start();
    };

    if (AppState.currentState === 'active') start();
    const sub = AppState.addEventListener('change', onChange);
    return () => {
      stop();
      sub.remove();
    };
  }, [targetMs]);

  return remaining;
}
