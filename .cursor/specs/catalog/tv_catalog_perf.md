# TV Catalog Performance

## Description

Release builds on Android TV / Fire TV must keep home and catalog screens light: no dead network work, smaller rail pages, cheaper poster decode, and minimal animation/paint cost while preserving D-pad focus behavior.

## Requirements

1. [x] Home does not fetch Quick Actions *counts* on TV (`library-*`, `history`, `collections` gated with `enabled: !isTv`); Quick Actions UI is shown on TV without those requests (see `home_quick_actions.md`).
2. [x] Catalog rails fetch at most 12 items per page on TV (`CATALOG_RAIL_PAGE_SIZE`) and load more near the right edge via `onLoadMore`.
3. [x] Lampa rail/grid posters resolve at TMDB `w342` (card is ~120px); anime posters prefer `source` / `optimized` over `thumbnail` / `preview` everywhere (including rails). Detail/hero sizes stay `w500` / `w780`.
4. [x] `PosterCard` / continue posters use `expo-image` `cachePolicy="memory-disk"`, `recyclingKey`, `transition={0}`, and explicit decode width/height matching the card.
5. [x] Skeleton placeholders on TV are static (no `Animated.loop`); loading rails show at most 4 skeletons on TV.
6. [x] Continue watching is capped at 10 items on TV before episode ordinal N+1 fetches.
7. [x] TV focus chrome uses ring + wash without shadow glow.
8. [x] `useNearViewport` checks visibility on TV only while the screen is focused. Subscribers share one `measureInWindow` pass per frame. A ~450ms interval remains a safety net when scroll events do not arrive. Scroll notifications may skip measure for slots clearly outside the keep/prefetch band. While `/watch` is open, TV viewport polling does not run.
9. [x] Catalog hubs (Home «Все», Anime, Movies, Series) mount poster rails only in the near-viewport band (prefetch ~1× ahead, keep ~0.75× behind) and unmount rails that leave that band. TV hubs must not stagger-fetch every source on a timer, and must not mark below-fold rails `eager`.
10. [x] TV sidebar hub switch lands the destination catalog at `scrollY = 0` (fresh landing). Rails that were mounted mid-feed unmount without a native scroll-into-view mount storm.
11. [x] TV catalog vertical focus registry notifies listeners at most once per animation frame.
12. [x] After Home is interactive, first-rail queries for Anime / Movies / Series are prefetched into React Query (not by pre-mounting those tabs).
13. [x] A TV horizontal rail keeps `ScrollView` (`focusable: false`) and mounts a focus window of posters (focused card ±3, spacers for the rest). Load-more still fires near the right edge. Phone rails stay `FlatList`.
14. [x] `TvHomeFeedGrid` mounts a vertical window of poster rows. Fetching the next page does not mount the entire accumulated list.
15. [x] On TV, hub tabs keep the current hub and the previous hub mounted. Older hubs unmount. `detachInactiveScreens` stays false so Android does not detach the kept scenes. Phone keep-alive is unchanged. Returning to an unmounted hub lands at `scrollY = 0`.
16. [x] Changing the Home feed tab or type filter swaps rail data. It does not remount the rail block through a React `key`.
17. [x] While the root `/watch` modal is open, the TV `(main)` stack uses `freezeOnBlur: true`.

## Acceptance Criteria

- Opening Home on a release TV build does not issue Quick Actions library/history/collection requests.
- An activated rail initially mounts ≤12 posters; scrolling right loads the next page. On TV only the focus window of that rail stays mounted.
- Focus ring remains visible; Left on the first rail card still reaches the sidebar.
- Loading states do not spawn dozens of opacity animation loops on TV.
- A long Home «Все» / Anime / Movies / Series feed does not keep every rail’s posters mounted; D-pad Down from a focused rail still reaches the next mounted row.
- Switching hubs from the TV sidebar does not animate a leftover mid-feed scroll back to the page title while mounting posters along the way.
- After visiting all four hubs, only the current and previous hub trees stay mounted.
- Changing the Home filter does not destroy and recreate every rail.
- Unfocused hub tabs do not keep `measureInWindow` polling. Opening the player stops TV viewport polling under `(main)`.

## Notes

- Lazy rail mount/fetch remains in `lazy_catalog_rails.md`.
- Horizontal FlatList virtualization is used on **phone**; TV keeps `ScrollView` (focus risk). The focus window lives inside that ScrollView and does not recycle the focused cell.
- Detail heroes / backdrop size live in `detail_screen_tv_perf.md`.
