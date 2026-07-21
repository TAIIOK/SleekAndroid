import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { findNodeHandle } from 'react-native';

import { useTvEventHandlerSafe } from '@/lib/tvEventHandler';
import { isTvUi } from '@/lib/isTvUi';

type FocusHost = {
  requestTVFocus?: () => void;
};

interface TvShellFocusValue {
  registerSidebarAnchor: (node: unknown) => void;
  /** Native tag for `nextFocusLeft` on rail-edge controls (avoids wild Left focus search). */
  sidebarNativeTag: number | undefined;
  /** Content return target for `nextFocusRight` from the overlay menu. */
  registerContentAnchor: (node: unknown) => void;
  contentNativeTag: number | undefined;
  /** True while a leftmost rail/continue card owns focus — Left exits to sidebar. */
  setExitLeftEnabled: (enabled: boolean) => void;
  /** True while the top content entry owns focus — Up exits to sidebar. */
  setExitUpEnabled: (enabled: boolean) => void;
  requestSidebarFocus: () => void;
  /** Drop armed Left/Up exits (call on route change). */
  resetExitFlags: () => void;
  /** Overlay side menu is visible (focus is in the sidebar or opening). */
  menuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  /** Track sidebar focus so the overlay stays open while moving between nav rows. */
  setSidebarFocused: (focused: boolean) => void;
}

const TvShellFocusContext = createContext<TvShellFocusValue | null>(null);

/**
 * Delay before Left/Up may jump to the sidebar after a rail-edge card gains focus.
 * Android moves focus on key-down, but rn-tvos only delivers the HW event on key-up.
 * Without this arm delay, Left from the 2nd card lands on the 1st then immediately
 * exits to the sidebar in the same press.
 */
const EXIT_ARM_MS = 220;

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

  const reset = useCallback(() => {
    countRef.current = 0;
    clearTimer();
    armedRef.current = false;
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    const next = Math.max(0, countRef.current + (enabled ? 1 : -1));
    countRef.current = next;

    if (next === 0) {
      clearTimer();
      armedRef.current = false;
      return;
    }

    // Re-arm whenever an edge control gains focus so a fresh 220ms window starts.
    if (enabled) {
      armedRef.current = false;
      clearTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        armedRef.current = countRef.current > 0;
      }, EXIT_ARM_MS);
    }
  }, []);

  return { armedRef, setEnabled, reset };
}

/**
 * TV sidebar focus bridge.
 * Horizontal ScrollViews on Android TV often swallow `nextFocusLeft`, so we
 * listen for D-pad Left/Up and call `requestTVFocus()` on the sidebar anchor.
 * Rail-edge controls also set `nextFocusLeft` to the sidebar tag when available
 * so Left does not 2D-search across the whole page.
 *
 * After sidebar route changes we do NOT call requestTVFocus on content — that
 * snaps catalog ScrollViews. Content lands via hasTVPreferredFocus when the
 * sidebar briefly becomes non-focusable.
 */
export function TvShellFocusProvider({ children }: { children: ReactNode }) {
  const hostRef = useRef<FocusHost | null>(null);
  const [sidebarNativeTag, setSidebarNativeTag] = useState<number | undefined>(undefined);
  const [contentNativeTag, setContentNativeTag] = useState<number | undefined>(undefined);
  const [menuOpen, setMenuOpen] = useState(false);
  const sidebarFocusCountRef = useRef(0);
  const closeMenuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitLeft = useArmedExitFlag();
  const exitUp = useArmedExitFlag();

  const clearCloseMenuTimer = useCallback(() => {
    if (closeMenuTimerRef.current != null) {
      clearTimeout(closeMenuTimerRef.current);
      closeMenuTimerRef.current = null;
    }
  }, []);

  const openMenu = useCallback(() => {
    clearCloseMenuTimer();
    setMenuOpen(true);
  }, [clearCloseMenuTimer]);

  const closeMenu = useCallback(() => {
    clearCloseMenuTimer();
    sidebarFocusCountRef.current = 0;
    setMenuOpen(false);
  }, [clearCloseMenuTimer]);

  const setSidebarFocused = useCallback(
    (focused: boolean) => {
      const next = Math.max(0, sidebarFocusCountRef.current + (focused ? 1 : -1));
      sidebarFocusCountRef.current = next;
      if (next > 0) {
        clearCloseMenuTimer();
        setMenuOpen(true);
        return;
      }
      // Blur→focus between nav rows is sequential; delay close so the menu does not flicker.
      clearCloseMenuTimer();
      closeMenuTimerRef.current = setTimeout(() => {
        closeMenuTimerRef.current = null;
        if (sidebarFocusCountRef.current === 0) {
          setMenuOpen(false);
        }
      }, 80);
    },
    [clearCloseMenuTimer],
  );

  const registerSidebarAnchor = useCallback((node: unknown) => {
    hostRef.current = (node as FocusHost) ?? null;
    const tag =
      node != null ? (findNodeHandle(node as Parameters<typeof findNodeHandle>[0]) ?? undefined) : undefined;
    setSidebarNativeTag((prev) => (prev === tag ? prev : tag));
  }, []);

  const registerContentAnchor = useCallback((node: unknown) => {
    const tag =
      node != null ? (findNodeHandle(node as Parameters<typeof findNodeHandle>[0]) ?? undefined) : undefined;
    setContentNativeTag((prev) => (prev === tag ? prev : tag));
  }, []);

  /** Open overlay first, then focus after layout — off-screen/hidden anchors reject focus. */
  const focusSidebarAfterOpen = useCallback(() => {
    clearCloseMenuTimer();
    setMenuOpen(true);
    const focus = () => hostRef.current?.requestTVFocus?.();
    focus();
    requestAnimationFrame(() => {
      focus();
      requestAnimationFrame(focus);
    });
  }, [clearCloseMenuTimer]);

  const requestSidebarFocus = useCallback(() => {
    focusSidebarAfterOpen();
  }, [focusSidebarAfterOpen]);

  const resetExitFlags = useCallback(() => {
    exitLeft.reset();
    exitUp.reset();
    clearCloseMenuTimer();
    sidebarFocusCountRef.current = 0;
    setMenuOpen(false);
    setContentNativeTag(undefined);
  }, [clearCloseMenuTimer, exitLeft.reset, exitUp.reset]);

  useTvEventHandlerSafe((event) => {
    // rn-tvos Android defaults to key-up HW events. Skip key-down if both fire.
    if (event.eventKeyAction === 0) return;

    if (event.eventType === 'left' && exitLeft.armedRef.current) {
      exitLeft.armedRef.current = false;
      focusSidebarAfterOpen();
      return;
    }
    if (event.eventType === 'up' && exitUp.armedRef.current) {
      exitUp.armedRef.current = false;
      focusSidebarAfterOpen();
    }
  });

  const value = useMemo(
    () => ({
      registerSidebarAnchor,
      sidebarNativeTag,
      registerContentAnchor,
      contentNativeTag,
      setExitLeftEnabled: exitLeft.setEnabled,
      setExitUpEnabled: exitUp.setEnabled,
      requestSidebarFocus,
      resetExitFlags,
      menuOpen,
      openMenu,
      closeMenu,
      setSidebarFocused,
    }),
    [
      registerSidebarAnchor,
      sidebarNativeTag,
      registerContentAnchor,
      contentNativeTag,
      exitLeft.setEnabled,
      exitUp.setEnabled,
      requestSidebarFocus,
      resetExitFlags,
      menuOpen,
      openMenu,
      closeMenu,
      setSidebarFocused,
    ],
  );

  if (!isTvUi()) {
    return <>{children}</>;
  }

  return <TvShellFocusContext.Provider value={value}>{children}</TvShellFocusContext.Provider>;
}

export function useTvShellFocus() {
  return useContext(TvShellFocusContext);
}
