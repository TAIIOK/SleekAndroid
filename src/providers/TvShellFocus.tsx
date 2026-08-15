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

import { createTvExitArm } from '@/lib/tvExitArm';
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
  /** Drop armed Left/Up exits only (same-hub detail push/pop). */
  resetExitArms: () => void;
  /** Drop armed exits, close overlay, clear content tag (hub switch). */
  resetExitFlags: () => void;
  /** Overlay side menu is visible (focus is in the sidebar or opening). */
  menuOpen: boolean;
  /** True while a sidebar nav row / profile chip actually owns focus. */
  sidebarFocused: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  /** Return D-pad focus to the last content anchor (Back dismiss). */
  requestContentFocus: () => void;
  /** Track sidebar focus so the overlay stays open while moving between nav rows. */
  setSidebarFocused: (focused: boolean) => void;
}

const TvShellFocusContext = createContext<TvShellFocusValue | null>(null);

function useArmedExitFlag() {
  const armRef = useRef(createTvExitArm());
  const setEnabled = useCallback((enabled: boolean) => {
    armRef.current.setEnabled(enabled);
  }, []);
  const reset = useCallback(() => {
    armRef.current.reset();
  }, []);
  return { armRef, setEnabled, reset };
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
  const contentHostRef = useRef<FocusHost | null>(null);
  const [sidebarNativeTag, setSidebarNativeTag] = useState<number | undefined>(undefined);
  const [contentNativeTag, setContentNativeTag] = useState<number | undefined>(undefined);
  const [menuOpen, setMenuOpenState] = useState(false);
  const [sidebarFocused, setSidebarFocusedState] = useState(false);
  const menuOpenRef = useRef(false);
  const sidebarFocusCountRef = useRef(0);
  const closeMenuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openMenuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitLeft = useArmedExitFlag();
  const exitUp = useArmedExitFlag();

  const setMenuOpen = useCallback((open: boolean) => {
    menuOpenRef.current = open;
    setMenuOpenState(open);
  }, []);

  const clearCloseMenuTimer = useCallback(() => {
    if (closeMenuTimerRef.current != null) {
      clearTimeout(closeMenuTimerRef.current);
      closeMenuTimerRef.current = null;
    }
  }, []);

  const clearOpenMenuTimer = useCallback(() => {
    if (openMenuTimerRef.current != null) {
      clearTimeout(openMenuTimerRef.current);
      openMenuTimerRef.current = null;
    }
  }, []);

  const openMenu = useCallback(() => {
    clearCloseMenuTimer();
    clearOpenMenuTimer();
    setMenuOpen(true);
  }, [clearCloseMenuTimer, clearOpenMenuTimer, setMenuOpen]);

  const closeMenu = useCallback(() => {
    clearCloseMenuTimer();
    clearOpenMenuTimer();
    sidebarFocusCountRef.current = 0;
    setSidebarFocusedState(false);
    setMenuOpen(false);
  }, [clearCloseMenuTimer, clearOpenMenuTimer, setMenuOpen]);

  const setSidebarFocused = useCallback(
    (focused: boolean) => {
      const next = Math.max(0, sidebarFocusCountRef.current + (focused ? 1 : -1));
      sidebarFocusCountRef.current = next;
      setSidebarFocusedState(next > 0);
      if (next > 0) {
        clearCloseMenuTimer();
        // Delay open so transient focus during detail remount does not flash the overlay.
        // Intentional Left/Up uses focusSidebarAfterOpen (immediate).
        clearOpenMenuTimer();
        openMenuTimerRef.current = setTimeout(() => {
          openMenuTimerRef.current = null;
          if (sidebarFocusCountRef.current > 0) {
            setMenuOpen(true);
          }
        }, 50);
        return;
      }
      // Blur→focus between nav rows is sequential; delay close so the menu does not flicker.
      clearOpenMenuTimer();
      clearCloseMenuTimer();
      closeMenuTimerRef.current = setTimeout(() => {
        closeMenuTimerRef.current = null;
        if (sidebarFocusCountRef.current === 0) {
          setMenuOpen(false);
        }
      }, 80);
    },
    [clearCloseMenuTimer, clearOpenMenuTimer, setMenuOpen],
  );

  const registerSidebarAnchor = useCallback((node: unknown) => {
    hostRef.current = (node as FocusHost) ?? null;
    const tag =
      node != null ? (findNodeHandle(node as Parameters<typeof findNodeHandle>[0]) ?? undefined) : undefined;
    setSidebarNativeTag((prev) => (prev === tag ? prev : tag));
  }, []);

  const registerContentAnchor = useCallback((node: unknown) => {
    contentHostRef.current = (node as FocusHost) ?? null;
    const tag =
      node != null ? (findNodeHandle(node as Parameters<typeof findNodeHandle>[0]) ?? undefined) : undefined;
    setContentNativeTag((prev) => (prev === tag ? prev : tag));
  }, []);

  const requestSidebarAnchorFocus = useCallback(() => {
    const focus = () => hostRef.current?.requestTVFocus?.();
    focus();
    requestAnimationFrame(() => {
      focus();
      requestAnimationFrame(focus);
    });
    // In-row Left dest still holds focus until the sidebar row becomes
    // focusable / the hop dest unfocuses; retry after that paint.
    setTimeout(focus, 50);
  }, []);

  /** Open overlay first, then focus after layout — off-screen/hidden anchors reject focus. */
  const focusSidebarAfterOpen = useCallback(() => {
    clearCloseMenuTimer();
    clearOpenMenuTimer();
    if (menuOpenRef.current) {
      requestSidebarAnchorFocus();
      return;
    }
    setMenuOpen(true);
    requestSidebarAnchorFocus();
  }, [clearCloseMenuTimer, clearOpenMenuTimer, requestSidebarAnchorFocus, setMenuOpen]);

  const requestSidebarFocus = useCallback(() => {
    focusSidebarAfterOpen();
  }, [focusSidebarAfterOpen]);

  const requestContentFocus = useCallback(() => {
    contentHostRef.current?.requestTVFocus?.();
  }, []);

  const resetExitArms = useCallback(() => {
    exitLeft.reset();
    exitUp.reset();
  }, [exitLeft.reset, exitUp.reset]);

  const resetExitFlags = useCallback(() => {
    resetExitArms();
    clearCloseMenuTimer();
    clearOpenMenuTimer();
    sidebarFocusCountRef.current = 0;
    setSidebarFocusedState(false);
    setMenuOpen(false);
    setContentNativeTag(undefined);
    contentHostRef.current = null;
  }, [clearCloseMenuTimer, clearOpenMenuTimer, resetExitArms, setMenuOpen]);

  useTvEventHandlerSafe((event) => {
    // rn-tvos Android defaults to key-up HW events. Skip key-down if both fire.
    // Native Left may already have 2D-searched Down; the arm grace keeps consume()
    // true through that blur so this key-up still opens the sidebar.
    if (event.eventKeyAction === 0) return;

    if (event.eventType === 'left' && exitLeft.armRef.current.consume()) {
      focusSidebarAfterOpen();
      return;
    }
    if (event.eventType === 'up' && exitUp.armRef.current.consume()) {
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
      resetExitArms,
      resetExitFlags,
      menuOpen,
      sidebarFocused,
      openMenu,
      closeMenu,
      requestContentFocus,
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
      resetExitArms,
      resetExitFlags,
      menuOpen,
      sidebarFocused,
      openMenu,
      closeMenu,
      requestContentFocus,
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
