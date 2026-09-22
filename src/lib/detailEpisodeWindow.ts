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

/**
 * Keep the mounted window while focus stays on an interior row.
 * Shift only when focus sits on the first row with rows above it,
 * or the last row with rows below it.
 */
export function resolveHeldTvEpisodeWindow(
  focusedIndex: number,
  itemCount: number,
  current: { start: number; end: number } | null,
): { start: number; end: number } {
  if (current && !shouldShiftTvEpisodeWindow(focusedIndex, itemCount, current)) {
    return current;
  }
  const next = slideTvEpisodeWindow(focusedIndex, itemCount);
  if (current && current.start === next.start && current.end === next.end) return current;
  return next;
}

function shouldShiftTvEpisodeWindow(
  focusedIndex: number,
  itemCount: number,
  current: { start: number; end: number },
): boolean {
  if (itemCount <= 0) return current.start !== 0 || current.end !== 0;
  const focus = Math.min(Math.max(0, focusedIndex), itemCount - 1);
  if (focus < current.start || focus >= current.end || current.end > itemCount || current.start < 0) {
    return true;
  }
  if (focus > current.start && focus < current.end - 1) return false;
  if (focus === current.start) return current.start > 0;
  return current.end < itemCount;
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
