import { isTvUi } from '@/lib/isTvUi';

/**
 * Vertical catalog ScrollView props for Android TV.
 *
 * Do not pass `snapToAlignment: 'item'` (or any value other than start/center/end).
 * Fabric parses that enum in C++ and `abort()`s the JS thread — the TV app closes
 * as soon as home/catalog mounts after login.
 */
export const tvVerticalCatalogScrollProps = isTvUi()
  ? ({
      // Android TV already scrolls the focused descendant into view.
    } as const)
  : ({} as const);

/**
 * Horizontal rail / continue ScrollView props for Android TV.
 * Instant focus scrolling — animated paging + snapToInterval often clears focus
 * when the rail shifts to keep the focused poster on screen.
 */
export const tvHorizontalCatalogScrollProps = isTvUi()
  ? ({
      // ScrollView must not compete with poster Pressables for D-pad focus.
      focusable: false,
    } as const)
  : ({} as const);

/** Keep rail/continue section wrappers from collapsing so measure/focus restore works. */
export const tvRailSectionSnapProps = isTvUi()
  ? ({
      collapsable: false,
    } as const)
  : ({} as const);
