import { isMobileChromeHiddenRoute } from '@/lib/mobileRoutes';

/** Top-level nav segment for sidebar park handoff (ignore detail push within hub). */
export function topLevelNavKey(path: string): string {
  if (!path || path === '/') return '/';
  const segment = path.split('/').filter(Boolean)[0] ?? '';
  if (!segment) return '/';
  if (segment === 'library') return '/library/lists';
  if (segment === 'friends' || segment === 'users') return '/friends/feed';
  if (segment === 'accounts' || segment === 'settings') return '/profile';
  return `/${segment}`;
}

/** Park/close the overlay only on hub switches — not `/movies` → `/movies/123`. */
export function shouldParkSidebarOnRouteChange(prevPath: string, nextPath: string): boolean {
  if (prevPath === nextPath) return false;
  return topLevelNavKey(prevPath) !== topLevelNavKey(nextPath);
}

/**
 * Closed menu keeps a hidden focusable only on hub/browse routes.
 * Detail, watch, and party-room screens must not expose that fallback —
 * Android 2D-search (Down from the player sink) would open the overlay.
 */
export function shouldKeepClosedMenuSidebarAnchor(path: string): boolean {
  return !isMobileChromeHiddenRoute(path);
}
