/** First TV anime episode page (phone still uses 24). */
export const TV_EPISODE_PAGE_SIZE = 12;

/** Rows mounted on first TV anime episode paint. */
export const TV_EPISODE_WINDOW_INITIAL = 6;

/** Extra rows kept mounted ahead of and behind the focused episode. */
export const TV_EPISODE_WINDOW_OVERSCAN = 4;

export const TV_EPISODE_THUMB_DECODE = { width: 120, height: 72 } as const;

/** Locked TV episode card height (title is a single line). */
export const TV_EPISODE_CARD_HEIGHT = 72;

export const TV_EPISODE_ROW_GAP = 6;

export const TV_EPISODE_ROW_STRIDE = TV_EPISODE_CARD_HEIGHT + TV_EPISODE_ROW_GAP;

/**
 * Sliding TV episode window around the focused row. Cards outside
 * `[start, end)` unmount; spacers keep the outer ScrollView height stable.
 */
export function slideTvEpisodeWindow(
  focusedIndex: number,
  itemCount: number,
  initial = TV_EPISODE_WINDOW_INITIAL,
  overscan = TV_EPISODE_WINDOW_OVERSCAN,
): { start: number; end: number } {
  if (itemCount <= 0) return { start: 0, end: 0 };
  const focus = Math.min(Math.max(0, focusedIndex), itemCount - 1);
  const start = Math.max(0, focus - overscan);
  const end = Math.min(itemCount, Math.max(start + initial, focus + overscan + 1));
  return { start, end };
}

export function tvEpisodeWindowSpacerHeights(
  start: number,
  end: number,
  itemCount: number,
  stride = TV_EPISODE_ROW_STRIDE,
): { top: number; bottom: number } {
  return {
    top: Math.max(0, start) * stride,
    bottom: Math.max(0, itemCount - end) * stride,
  };
}
