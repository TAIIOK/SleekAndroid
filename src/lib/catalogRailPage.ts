/** Initial / page fetch size for horizontal catalog rails (phone + TV). */
export const CATALOG_RAIL_PAGE_SIZE = 12;

/** Max posters / cast tiles mounted on a detail rail once it activates. */
export const DETAIL_TV_RAIL_CAP = CATALOG_RAIL_PAGE_SIZE;

/** Cast fetched for the detail preview and the full-list screen. */
export const DETAIL_CAST_FETCH_LIMIT = 48;

/** First N rails on a TV catalog page start mounted; the rest wait for the viewport. */
export const TV_CATALOG_EAGER_RAILS = 2;

export function capDetailRailItems<T>(items: T[]): T[] {
  if (items.length <= DETAIL_TV_RAIL_CAP) return items;
  return items.slice(0, DETAIL_TV_RAIL_CAP);
}
