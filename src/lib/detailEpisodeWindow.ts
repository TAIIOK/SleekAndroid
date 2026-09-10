/** First TV anime episode page (phone still uses 24). */
export const TV_EPISODE_PAGE_SIZE = 12;

/** Rows mounted on first TV anime episode paint. */
export const TV_EPISODE_WINDOW_INITIAL = 8;

/** Extra rows kept mounted ahead of the focused episode. */
export const TV_EPISODE_WINDOW_OVERSCAN = 4;

export const TV_EPISODE_THUMB_DECODE = { width: 120, height: 72 } as const;

/**
 * Grow-only TV episode window. Cards above the focused row stay mounted so
 * D-pad Up keeps a native focus target.
 */
export function growTvEpisodeWindow(
  current: number,
  focusedIndex: number,
  itemCount: number,
  initial = TV_EPISODE_WINDOW_INITIAL,
  overscan = TV_EPISODE_WINDOW_OVERSCAN,
): number {
  if (itemCount <= 0) return 0;
  const grown = Math.max(current, initial, focusedIndex + overscan + 1);
  return Math.min(itemCount, grown);
}
