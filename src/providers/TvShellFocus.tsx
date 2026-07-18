import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import { useTvEventHandlerSafe } from '@/lib/tvEventHandler';

type FocusHost = {
  requestTVFocus?: () => void;
};

interface TvShellFocusValue {
  registerSidebarAnchor: (node: unknown) => void;
  /** True while a leftmost rail/continue card owns focus — Left exits to sidebar. */
  setExitLeftEnabled: (enabled: boolean) => void;
  /** True while the top content entry owns focus — Up exits to sidebar. */
  setExitUpEnabled: (enabled: boolean) => void;
  requestSidebarFocus: () => void;
}

const TvShellFocusContext = createContext<TvShellFocusValue | null>(null);

/**
 * Delay before Left/Up may jump to the sidebar after a rail-edge card gains focus.
 * Android moves focus on key-down, but rn-tvos only delivers the HW event on key-up.
 * Without this arm delay, Left from the 2nd card lands on the 1st then immediately
 * exits to the sidebar in the same press.
 */
const EXIT_ARM_MS = 180;

function useArmedExitFlag() {
  const countRef = useRef(0);
  const armedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const setEnabled = useCallback((enabled: boolean) => {
    const next = Math.max(0, countRef.current + (enabled ? 1 : -1));
    countRef.current = next;

    if (next === 0) {
      clearTimer();
      armedRef.current = false;
      return;
    }

    if (enabled && next === 1) {
      armedRef.current = false;
      clearTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        armedRef.current = countRef.current > 0;
      }, EXIT_ARM_MS);
    }
  }, []);

  return { armedRef, setEnabled };
}

/**
 * TV sidebar focus bridge.
 * Horizontal ScrollViews on Android TV often swallow `nextFocusLeft`, so we
 * listen for D-pad Left/Up and call `requestTVFocus()` on the sidebar anchor.
 */
export function TvShellFocusProvider({ children }: { children: ReactNode }) {
  const hostRef = useRef<FocusHost | null>(null);
  const exitLeft = useArmedExitFlag();
  const exitUp = useArmedExitFlag();

  const registerSidebarAnchor = useCallback((node: unknown) => {
    hostRef.current = (node as FocusHost) ?? null;
  }, []);

  const requestSidebarFocus = useCallback(() => {
    hostRef.current?.requestTVFocus?.();
  }, []);

  useTvEventHandlerSafe((event) => {
    // rn-tvos Android defaults to key-up HW events. Skip key-down if both fire.
    if (event.eventKeyAction === 0) return;

    if (event.eventType === 'left' && exitLeft.armedRef.current) {
      hostRef.current?.requestTVFocus?.();
      return;
    }
    if (event.eventType === 'up' && exitUp.armedRef.current) {
      hostRef.current?.requestTVFocus?.();
    }
  });

  const value = useMemo(
    () => ({
      registerSidebarAnchor,
      setExitLeftEnabled: exitLeft.setEnabled,
      setExitUpEnabled: exitUp.setEnabled,
      requestSidebarFocus,
    }),
    [registerSidebarAnchor, exitLeft.setEnabled, exitUp.setEnabled, requestSidebarFocus],
  );

  if (!Platform.isTV) {
    return <>{children}</>;
  }

  return <TvShellFocusContext.Provider value={value}>{children}</TvShellFocusContext.Provider>;
}

export function useTvShellFocus() {
  return useContext(TvShellFocusContext);
}
