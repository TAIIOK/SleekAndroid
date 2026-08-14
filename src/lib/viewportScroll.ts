const listeners = new Set<() => void>();
let frameScheduled = false;
let lastScrollY = 0;

export function notifyViewportScroll(scrollY?: number): void {
  if (typeof scrollY === 'number' && Number.isFinite(scrollY)) {
    lastScrollY = Math.max(0, scrollY);
  }
  if (frameScheduled) return;
  frameScheduled = true;
  requestAnimationFrame(() => {
    frameScheduled = false;
    for (const listener of listeners) {
      listener();
    }
  });
}

export function getViewportScrollY(): number {
  return lastScrollY;
}

export function subscribeViewportScroll(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
