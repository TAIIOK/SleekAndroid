import { Platform } from 'react-native';

/** Initial / page fetch size for horizontal catalog rails. */
export const CATALOG_RAIL_PAGE_SIZE = Platform.isTV ? 12 : 24;
