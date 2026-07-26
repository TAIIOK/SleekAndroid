import { useEffect, useRef, useState, type MutableRefObject } from 'react';

export type PlayerPerfSnapshot = {
  /** JS-thread FPS from requestAnimationFrame. */
  fps: number;
  /** Average frame duration over the last sample window (ms). */
  frameMs: number;
  /** React renders of the host player component per second. */
  uiRps: number;
  /** Total React renders since mount. */
  uiRenders: number;
};

const SAMPLE_MS = 500;

/**
 * Host-side render counter. Call `noteRender()` once per host render.
 * Snapshot sampling lives in `PlayerPerfOverlay` so FPS ticks do not inflate UI RPS.
 */
export function usePlayerPerfRenderCounter(enabled: boolean): {
  noteRender: () => void;
  renderCountRef: MutableRefObject<number>;
} {
  const renderCountRef = useRef(0);

  const noteRender = () => {
    if (!enabled) return;
    renderCountRef.current += 1;
  };

  return { noteRender, renderCountRef };
}

/** Samples JS FPS + host UI render rate; keep state inside the overlay only. */
export function usePlayerPerfSampler(
  enabled: boolean,
  renderCountRef: MutableRefObject<number>,
): PlayerPerfSnapshot {
  const [snapshot, setSnapshot] = useState<PlayerPerfSnapshot>({
    fps: 0,
    frameMs: 0,
    uiRps: 0,
    uiRenders: 0,
  });

  useEffect(() => {
    if (!enabled) return;

    let rafId = 0;
    let cancelled = false;
    const now = () =>
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();

    let sampleTime = now();
    let sampleFrames = 0;
    let sampleRenders = renderCountRef.current;

    const tick = () => {
      if (cancelled) return;
      const t = now();
      sampleFrames += 1;

      const elapsed = t - sampleTime;
      if (elapsed >= SAMPLE_MS) {
        const renders = renderCountRef.current - sampleRenders;
        const seconds = elapsed / 1000;
        setSnapshot({
          fps: Math.round(sampleFrames / seconds),
          frameMs: sampleFrames > 0 ? Math.round((elapsed / sampleFrames) * 10) / 10 : 0,
          uiRps: Math.round((renders / seconds) * 10) / 10,
          uiRenders: renderCountRef.current,
        });
        sampleTime = t;
        sampleFrames = 0;
        sampleRenders = renderCountRef.current;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [enabled, renderCountRef]);

  return snapshot;
}
