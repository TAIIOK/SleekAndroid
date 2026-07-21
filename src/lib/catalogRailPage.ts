import { isTvUi } from '@/lib/isTvUi';

/** Initial / page fetch size for horizontal catalog rails. */
export const CATALOG_RAIL_PAGE_SIZE = isTvUi() ? 12 : 24;
