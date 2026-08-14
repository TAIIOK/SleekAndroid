/** Next card to reclaim after D-pad Left/Right escaped the rail via 2D search. */
export function railFocusStealIndex(
  fromIndex: number,
  direction: 1 | -1,
  itemCount: number,
): number | null {
  if (itemCount <= 0) return null;
  if (direction < 0 && fromIndex <= 0) return null;
  return Math.max(0, Math.min(itemCount - 1, fromIndex + direction));
}

/**
 * Native `nextFocusLeft` for a TV control.
 * Rail-start prefers an in-row dest (same focus guide) then the sidebar tag.
 * Mid-rail cards keep their sibling.
 */
export function tvNextFocusLeft(options: {
  railStart: boolean;
  exitTag?: number;
  siblingTag?: number;
}): number | undefined {
  if (options.railStart) return options.siblingTag ?? options.exitTag;
  return options.siblingTag;
}
