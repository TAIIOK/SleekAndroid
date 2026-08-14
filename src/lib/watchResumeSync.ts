let watchSessionOpen = false;

/** Call when the player route mounts so Home can refresh continue-watching on return. */
export function markWatchSessionOpen(): void {
  watchSessionOpen = true;
}

/** True once after a watch session until consumed. Home uses this instead of every focus. */
export function consumeWatchSession(): boolean {
  if (!watchSessionOpen) return false;
  watchSessionOpen = false;
  return true;
}

export function peekWatchSession(): boolean {
  return watchSessionOpen;
}
