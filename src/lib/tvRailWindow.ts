/** Posters kept on each side of the focused TV rail card. */
export const TV_RAIL_FOCUS_RADIUS = 3;

export function slideTvRailWindow(
  focusedIndex: number,
  itemCount: number,
  radius = TV_RAIL_FOCUS_RADIUS,
): { start: number; end: number } {
  if (itemCount <= 0) return { start: 0, end: 0 };
  const focus = Math.min(Math.max(0, focusedIndex), itemCount - 1);
  const start = Math.max(0, focus - radius);
  const end = Math.min(itemCount, Math.max(start + radius * 2 + 1, focus + radius + 1));
  return { start, end };
}

/** Shift the rail window only from its first or last mounted card. */
export function resolveHeldTvRailWindow(
  focusedIndex: number,
  itemCount: number,
  current: { start: number; end: number } | null,
): { start: number; end: number } {
  if (current && !shouldShift(focusedIndex, itemCount, current)) return current;
  const next = slideTvRailWindow(focusedIndex, itemCount);
  if (current && current.start === next.start && current.end === next.end) return current;
  return next;
}

function shouldShift(
  focusedIndex: number,
  itemCount: number,
  current: { start: number; end: number },
): boolean {
  if (itemCount <= 0) return current.start !== 0 || current.end !== 0;
  const focus = Math.min(Math.max(0, focusedIndex), itemCount - 1);
  if (focus < current.start || focus >= current.end || current.end > itemCount) return true;
  if (focus > current.start && focus < current.end - 1) return false;
  if (focus === current.start) return current.start > 0;
  return current.end < itemCount;
}

export function slideTvGridWindow(
  focusedIndex: number,
  itemCount: number,
  columns: number,
): { start: number; end: number } {
  if (itemCount <= 0 || columns <= 0) return { start: 0, end: 0 };
  const focus = Math.min(Math.max(0, focusedIndex), itemCount - 1);
  const row = Math.floor(focus / columns);
  const startRow = Math.max(0, row - 1);
  const end = Math.min(itemCount, (row + 2) * columns);
  return { start: startRow * columns, end };
}

/** Keep mounted grid rows until focus enters the first or last mounted row. */
export function resolveHeldTvGridWindow(
  focusedIndex: number,
  itemCount: number,
  columns: number,
  current: { start: number; end: number } | null,
): { start: number; end: number } {
  if (!current) return slideTvGridWindow(focusedIndex, itemCount, columns);
  if (itemCount <= 0 || columns <= 0) return current.start === 0 && current.end === 0 ? current : { start: 0, end: 0 };
  const focus = Math.min(Math.max(0, focusedIndex), itemCount - 1);
  const focusRow = Math.floor(focus / columns);
  const startRow = Math.floor(current.start / columns);
  const lastRow = Math.max(startRow, Math.ceil(current.end / columns) - 1);
  const interior = focusRow > startRow && focusRow < lastRow;
  const pinnedTop = focusRow === startRow && startRow === 0;
  const pinnedBottom = focusRow === lastRow && current.end >= itemCount;
  if ((interior || pinnedTop || pinnedBottom) && current.end <= itemCount && focus >= current.start && focus < current.end) {
    return current;
  }
  const next = slideTvGridWindow(focus, itemCount, columns);
  if (next.start === current.start && next.end === current.end) return current;
  return next;
}
