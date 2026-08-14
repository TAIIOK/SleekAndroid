import { useEffect, useState } from 'react';

let locked = false;
const listeners = new Set<() => void>();

/** While a watch/party player is open, catalog/lobby TvFocusables must drop focus. */
export function setTvImmersiveFocusLock(value: boolean) {
  if (locked === value) return;
  locked = value;
  listeners.forEach((listener) => listener());
}

export function isTvImmersiveFocusLocked(): boolean {
  return locked;
}

export function useTvImmersiveFocusLock(): boolean {
  const [value, setValue] = useState(locked);
  useEffect(() => {
    const listener = () => setValue(locked);
    listeners.add(listener);
    listener();
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return value;
}
