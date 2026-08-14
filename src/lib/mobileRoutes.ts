/**
 * Detail pages with full-bleed hero — hide floating mobile chrome (site parity).
 */
export function isMobileDetailRoute(pathname: string): boolean {
  return (
    /^\/anime\/[^/]+$/.test(pathname) ||
    /^\/movies\/[^/]+$/.test(pathname) ||
    /^\/series\/[^/]+$/.test(pathname) ||
    /^\/person\/[^/]+$/.test(pathname)
  );
}

/**
 * Routes where (main) AppShell must not show top/bottom nav.
 * Watch lives outside (main) but the shell stays mounted underneath the modal
 * and still sees global segments — without this the nav flashes when playback starts.
 */
export function isMobileChromeHiddenRoute(pathname: string): boolean {
  if (isMobileDetailRoute(pathname)) return true;
  if (pathname === '/watch' || pathname.startsWith('/watch/')) return true;
  // Fullscreen party room / invite accept
  if (/^\/party\/[^/]+/.test(pathname) && pathname !== '/party/invite') return true;
  if (pathname.startsWith('/party/invite/')) return true;
  return false;
}

/**
 * Hubs that keep classic shell: fixed nav + scrollable body + footer in document flow.
 * Library uses overlay chrome so the top nav scrolls away with content (same as home).
 */
export function isMobileChromeShellLayoutRoute(pathname: string): boolean {
  if (pathname === '/party') return true;
  return false;
}

/** Routes where the floating top island stays put while the page scrolls. */
export function isMobileChromeScrollPinnedRoute(pathname: string): boolean {
  return isMobileChromeShellLayoutRoute(pathname);
}
