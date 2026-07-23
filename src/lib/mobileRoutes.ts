/**
 * Detail pages with full-bleed hero — hide floating mobile chrome (site parity).
 */
export function isMobileDetailRoute(pathname: string): boolean {
  return (
    /^\/anime\/[^/]+$/.test(pathname) ||
    /^\/movies\/[^/]+$/.test(pathname) ||
    /^\/series\/[^/]+$/.test(pathname)
  );
}

/**
 * Routes where (main) AppShell must not show top/bottom nav.
 * Watch lives outside (main) but the shell stays mounted underneath the modal
 * and still sees global segments — without this the nav flashes when playback starts.
 */
export function isMobileChromeHiddenRoute(pathname: string): boolean {
  if (isMobileDetailRoute(pathname)) return true;
  return pathname === '/watch' || pathname.startsWith('/watch/');
}
