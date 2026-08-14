/** Screens ahead of the window that still mount a TV rail (Down must hit a live row). */
export const TV_PREFETCH_SCREEN_FACTOR = 1;
/** Screens behind the window that keep a TV rail mounted. */
export const TV_KEEP_SCREEN_FACTOR = 0.75;
export const PHONE_VIEWPORT_SCREEN_FACTOR = 1.25;

/** Prefetch band ahead of the viewport (next D-pad rails can mount). */
export function defaultPrefetchMargin(screenH: number, isTv: boolean): number {
  return Math.round(screenH * (isTv ? TV_PREFETCH_SCREEN_FACTOR : PHONE_VIEWPORT_SCREEN_FACTOR));
}

/** Keep band behind the viewport. Tighter on TV so long feeds unmount. */
export function defaultKeepMargin(screenH: number, isTv: boolean): number {
  return Math.round(screenH * (isTv ? TV_KEEP_SCREEN_FACTOR : PHONE_VIEWPORT_SCREEN_FACTOR));
}

/**
 * Whether a rail slot should stay mounted.
 * Ahead (below the window) uses prefetchMargin; behind (above) uses keepMargin
 * so D-pad Down still hits a live rail without keeping ~5 screens of posters.
 */
export function isRailNearViewport(
  y: number,
  height: number,
  screenH: number,
  prefetchMargin: number,
  keepMargin: number,
  slack = 0,
): boolean {
  const bottom = y + Math.max(height, 1);
  if (bottom > 0 && y < screenH) return true;
  if (y >= screenH) return y - screenH <= prefetchMargin + slack;
  return -bottom <= keepMargin + slack;
}

/** Extra band where we still measureInWindow instead of trusting contentY - scrollY. */
export const FAR_MEASURE_SLACK_PX = 200;

/**
 * Skip measureInWindow when content-relative layout is clearly outside the keep/prefetch
 * band (plus slack). Borderline slots still measure for nested ScrollView / chrome insets.
 */
export function isSlotClearlyFarFromViewport(
  contentY: number,
  height: number,
  scrollY: number,
  screenH: number,
  prefetchMargin: number,
  keepMargin: number,
): boolean {
  const y = contentY - scrollY;
  return !isRailNearViewport(
    y,
    height,
    screenH,
    prefetchMargin + FAR_MEASURE_SLACK_PX,
    keepMargin + FAR_MEASURE_SLACK_PX,
  );
}
