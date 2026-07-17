type SessionListener = () => void;

const listeners = new Set<SessionListener>();

export function onSessionExpired(listener: SessionListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifySessionExpired(): void {
  listeners.forEach((listener) => listener());
}
