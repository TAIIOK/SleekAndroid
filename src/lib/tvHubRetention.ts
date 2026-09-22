import { isTvUi } from '@/lib/isTvUi';

type Retention = { current: string | null; previous: string | null };

let retention: Retention = { current: null, previous: null };
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** Remember the focused hub and the one before it. Older hubs drop out. */
export function noteTvHub(path: string) {
  if (!isTvUi() || retention.current === path) return;
  retention = { current: path, previous: retention.current };
  emit();
}

export function subscribeTvHubRetention(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isTvHubRetained(path: string): boolean {
  if (!isTvUi()) return true;
  if (retention.current == null) return true;
  return path === retention.current || path === retention.previous;
}
