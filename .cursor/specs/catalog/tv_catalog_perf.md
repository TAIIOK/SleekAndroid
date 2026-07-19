# TV Catalog Performance

## Description

Release builds on Android TV / Fire TV must keep home and catalog screens light: no dead network work, smaller rail pages, cheaper poster decode, and minimal animation/paint cost while preserving D-pad focus behavior.

## Requirements

1. [x] Home does not fetch Quick Actions *counts* on TV (`library-*`, `history`, `collections` gated with `enabled: !Platform.isTV`); the Quick Actions UI still renders with static subtitles.
2. [x] Catalog rails fetch at most 12 items per page on TV (`CATALOG_RAIL_PAGE_SIZE`) and load more near the right edge via `onLoadMore`.
3. [x] Lampa rail posters resolve at TMDB `w185`; anime rails prefer `thumbnail` / `preview` over full `source`.
4. [x] `PosterCard` / continue posters use `expo-image` `cachePolicy="memory-disk"` and `recyclingKey`.
5. [x] Skeleton placeholders on TV are static (no `Animated.loop`); loading rails show at most 4 skeletons on TV.
6. [x] Continue watching is capped at 10 items on TV before episode ordinal N+1 fetches.
7. [x] TV focus chrome uses ring + wash without shadow glow.
8. [x] `useNearViewport` polls at ~450ms on TV while inactive (layout check still runs immediately).

## Acceptance Criteria

- Opening Home on a release TV build does not issue Quick Actions library/history/collection requests.
- An activated rail initially mounts ≤12 posters; scrolling right loads the next page.
- Focus ring remains visible; Left on the first rail card still reaches the sidebar.
- Loading states do not spawn dozens of opacity animation loops on TV.

## Notes

- Lazy rail mount/fetch remains in `lazy_catalog_rails.md`.
- Horizontal FlatList virtualization is deferred (TV focus risk).
- Detail heroes / backdrop size are out of this pack.
