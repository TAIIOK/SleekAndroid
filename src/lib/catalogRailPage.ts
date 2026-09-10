/** Initial / page fetch size for horizontal catalog rails (phone + TV). */
export const CATALOG_RAIL_PAGE_SIZE = 12;

/** Max posters / cast tiles mounted on a TV detail rail once it activates. */
export const DETAIL_TV_RAIL_CAP = CATALOG_RAIL_PAGE_SIZE;

/** First N rails on a TV catalog page start mounted; the rest wait for the viewport. */
export const TV_CATALOG_EAGER_RAILS = 2;

export function capDetailRailItems<T>(items: T[], isTv: boolean): T[] {
  if (!isTv || items.length <= DETAIL_TV_RAIL_CAP) return items;
  return items.slice(0, DETAIL_TV_RAIL_CAP);
}
