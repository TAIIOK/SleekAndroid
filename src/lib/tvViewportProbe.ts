import { isTvUi } from '@/lib/isTvUi';

type Probe = () => void;

const probes = new Set<Probe>();
let timer: ReturnType<typeof setInterval> | null = null;
let suspended = false;

const TV_PROBE_MS = 450;

/** Pause catalog viewport probes while the player covers `(main)`. */
export function setTvViewportProbeSuspended(suspendedNext: boolean) {
  suspended = suspendedNext;
}

/**
 * One interval for every TV lazy-rail slot. Each tick measures in a single frame
 * instead of each rail running its own timer.
 */
export function registerTvViewportProbe(probe: Probe): () => void {
  if (!isTvUi()) return () => {};
  probes.add(probe);
  if (!timer) {
    timer = setInterval(() => {
      if (suspended || probes.size === 0) return;
      requestAnimationFrame(() => {
        if (suspended) return;
        for (const run of probes) run();
      });
    }, TV_PROBE_MS);
  }
  return () => {
    probes.delete(probe);
    if (probes.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}
