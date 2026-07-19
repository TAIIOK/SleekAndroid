# Lazy Catalog Rails

## Description

Catalog rails (home, anime, movies, series) must fetch section items and mount poster rows only when the rail is near the viewport, so release builds on Android TV do not decode and render every poster at once.

## Requirements

1. [x] Each anime showcase rail fetches its list only after the rail is near the viewport (`useQuery` `enabled` gated by visibility).
2. [x] Each Lampa section rail fetches its items only after the rail is near the viewport.
3. [x] The anime recommendations feed request starts only when the recommendations block is near the viewport.
4. [x] Inactive rails reserve approximate vertical space so scroll/focus travel does not collapse the page.
5. [x] Rails already near the first screen activate without waiting for the user to scroll (prefetch margin: ~2× viewport on TV, ~1.25× elsewhere).
6. [x] Category/section metadata queries (showcase lists, Lampa section lists) may still load eagerly so the app knows which rails exist.

## Acceptance Criteria

- Opening Home on a release TV build does not fire every showcase/section item request at once.
- Scrolling or moving focus toward a lower rail starts that rail’s request and mounts its posters.
- Above-the-fold rails (continue watching / first visible catalog rows) still appear promptly.

## Notes

- Visibility uses `measureInWindow` polling in `useNearViewport` so nested `ScrollView` focus scrolling is covered without a scroll-context rewrite.
- Phone catalog screens use the same gate; cost is low and release memory pressure is shared.
