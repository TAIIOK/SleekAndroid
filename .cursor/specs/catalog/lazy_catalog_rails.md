# Lazy Catalog Rails

## Description

Catalog rails (home, anime, movies, series) must fetch section items and mount poster rows only when the rail is near the viewport, so release builds on Android TV do not decode and render every poster at once. Rails that leave the keep band unmount so long feeds do not keep every poster tree mounted.

## Requirements

1. [x] Each anime showcase rail fetches its list only after the rail is near the viewport (`useQuery` `enabled` gated by visibility).
2. [x] Each Lampa section rail fetches its items only after the rail is near the viewport.
3. [x] The anime recommendations feed request starts when recommendation slots are on the page; the query stays in the parent (React Query cache). Each rec poster row is a reserved slot in **config order** and unmounts when it leaves the keep band. The rec block must not collapse to a single placeholder (that would let later showcases activate too early and then jump when the feed arrives).
4. [x] Inactive rails reserve approximate vertical space so scroll/focus travel does not collapse the page. After a rail has mounted, the reserved height is the last measured height, not a one-rail estimate.
5. [x] Rails already near the first screen activate without waiting for the user to scroll (prefetch margin: ~1× viewport on TV, ~1.25× elsewhere).
6. [x] Category/section metadata queries (showcase lists, Lampa section lists) may still load eagerly so the app knows which rails exist.
7. [x] TV Home, TV browse, and phone browse unmount rail poster trees when the slot leaves the keep band (`deactivateWhenFar`). TV keep band is ~0.75× viewport behind; prefetch is ~1× ahead.
8. [x] `eager` rails start mounted (no placeholder flash) but still poll and unmount when far.
9. [x] TV catalog vertical `onScroll` notifies `useNearViewport` immediately (`notifyViewportScroll`); 450ms poll and `onLayout` always `measureInWindow` so native D-pad focus-scroll still mounts the next rail. Scroll notifications may skip measure for slots clearly outside the band.
10. [x] Browse hubs (Anime / Movies / Series) do not mount below-fold `LazyCatalogRail` slots in the same frame as the eager top rails. Remaining slots mount on the next frame (`setTimeout(0)` + rAF, not `InteractionManager`).
11. [x] Movies / Series show `CatalogBrowseSkeleton` while home config is not `ready`, then the existing cold-start first-rail gate.

## Acceptance Criteria

- Opening Home on a release TV build does not fire every showcase/section item request at once.
- Scrolling or moving focus toward a lower rail starts that rail’s request and mounts its posters.
- Above-the-fold rails (continue watching / first visible catalog rows) still appear promptly.
- After scrolling a long TV Home «Все» feed, rails more than ~0.75 screen above unmount; Down still lands on an already-mounted next rail.
- TV Anime / Movies / Series browse viewport-gates section rails the same way as Home: the first two above-the-fold rails are `eager`. Anime browse also keeps the seasonal rail eager, then the first two recommendation (or showcase) rails, so the first TV screen always has posters. Remaining rec/showcase rows stay viewport-gated. Movies/Series keep a first-rail skeleton on cold start.

## Notes

- Visibility uses `measureInWindow` in `useNearViewport` for nested `ScrollView` / TV focus-scroll. Polling runs only while the screen is focused; slots clearly outside the keep/prefetch band (contentY − scrollY) skip `measureInWindow`.
- Phone Home uses scroll-position gating (`homeLazy` / `HomeScrollLazy`) and **deactivates** rails that leave the viewport so long feeds do not keep every poster tree mounted. The first two phone-home rails start mounted (`eager`) so they fetch without waiting on `measureLayout`.
- Phone and TV browse (Anime / Movies / Series) and TV Home catalog rows use `LazyCatalogRail` + `deactivateWhenFar` (`useNearViewport`). Item queries run only while the row is mounted (first two page-top rails eager, then viewport). Anime browse does not mark below-fold showcases `eager` and does not wrap all rec rows in one expanding slot. There is no stagger timer that fetches every source.
- TV Home anime recommendation rails fetch `/api/v2/catalog/recommendations/anime?sections=` (not a generic anime list decode).
- Phone horizontal rails use `FlatList` virtualization in `PaginatedContentRow`; TV keeps `ScrollView` (D-pad focus).
- TV Movies/Series browse shows `CatalogBrowseSkeleton` until the first section can paint, then viewport-gates the rest. Warm cache skips the skeleton but does not mount every rail.
- Below-fold browse slots are not created in the same React commit as the first two eager rails.
