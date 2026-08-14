/** Paths available in the TV UI (expanded for site parity). */
const TV_ALLOWED_PREFIXES = [
  '/auth',
  '/watch',
  '/search',
  '/history',
  '/library',
  '/anime',
  '/movies',
  '/series',
  '/schedule',
  '/profile',
  '/accounts',
  '/settings',
  '/login',
  '/party',
  '/friends',
  '/users',
  '/person',
] as const;

export function isTvAllowedPath(pathname: string): boolean {
  if (pathname === '/' || pathname === '') return true;
  return TV_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function tvRedirectPath(pathname: string): string {
  if (pathname.startsWith('/manga')) return '/anime';
  if (pathname === '/downloads' || pathname.startsWith('/downloads/')) return '/';
  if (pathname === '/feed' || pathname.startsWith('/feed/')) return '/friends/feed';
  return '/';
}
