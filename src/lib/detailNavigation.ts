import { router as expoRouter } from 'expo-router';

/** Where to return from a mobile detail screen when the stack cannot pop. */
let detailReturnPath: string | null = null;

export function setDetailReturnPath(path: string): void {
  detailReturnPath = path.trim() || '/';
}

export function peekDetailReturnPath(): string | null {
  return detailReturnPath;
}

function takeDetailReturnPath(): string | null {
  const path = detailReturnPath;
  detailReturnPath = null;
  return path;
}

export function defaultDetailReturnPath(detailPath: string): string {
  if (/^\/anime\/[^/]+$/.test(detailPath)) return '/anime';
  if (/^\/movies\/[^/]+$/.test(detailPath)) return '/movies';
  if (/^\/series\/[^/]+$/.test(detailPath)) return '/series';
  if (/^\/person\/[^/]+$/.test(detailPath)) return '/movies';
  return '/';
}

/**
 * Leave a mobile detail screen.
 *
 * Prefer `dismiss()` (stack POP) so the previous screen stays mounted and does
 * not reload. Detail routes live on the (main) Stack above hub Tabs, so Home →
 * series/movie/anime → Back pops to Home, and catalog → detail → Back pops to
 * that hub without remounting rails.
 *
 * Avoid `back()` / GO_BACK — with nested navigators it can report canGoBack
 * while no navigator handles the action.
 *
 * Fall back to `dismissTo(returnPath)` for cold starts / deep links with an
 * empty stack (pops to the hub if present, otherwise lands on it).
 */
export function navigateBackFromDetail(_router: unknown, currentDetailPath: string): void {
  const target = takeDetailReturnPath() ?? defaultDetailReturnPath(currentDetailPath);

  if (__DEV__) {
    console.log('[detailBack]', {
      currentDetailPath,
      target,
      canDismiss: expoRouter.canDismiss(),
    });
  }

  if (expoRouter.canDismiss()) {
    expoRouter.dismiss();
    return;
  }

  expoRouter.dismissTo(target as '/');
}
