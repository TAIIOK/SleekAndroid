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
8. [x] `useNearViewport` polls at ~450ms on TV only while the screen is focused. Interval / layout / focus always `measureInWindow` (D-pad native scroll). Scroll notifications may skip measure for slots clearly outside the keep/prefetch band.
9. [x] Catalog hubs (Home «Все», Anime, Movies, Series) mount poster rails only in the near-viewport band (prefetch ~1× ahead, keep ~0.75× behind) and unmount rails that leave that band. TV hubs must not stagger-fetch every source on a timer, and must not mark below-fold rails `eager`.
10. [x] TV sidebar hub switch lands the destination catalog at `scrollY = 0` (fresh landing). Rails that were mounted mid-feed unmount without a native scroll-into-view mount storm.
11. [x] TV catalog vertical focus registry notifies listeners at most once per animation frame.
12. [x] After Home is interactive, first-rail queries for Anime / Movies / Series are prefetched into React Query (not by pre-mounting those tabs).

## Acceptance Criteria

- Opening Home on a release TV build does not issue Quick Actions library/history/collection requests.
- An activated rail initially mounts ≤12 posters; scrolling right loads the next page.
- Focus ring remains visible; Left on the first rail card still reaches the sidebar.
- Loading states do not spawn dozens of opacity animation loops on TV.
- A long Home «Все» / Anime / Movies / Series feed does not keep every rail’s posters mounted; D-pad Down from a focused rail still reaches the next mounted row.
- Switching hubs from the TV sidebar does not animate a leftover mid-feed scroll back to the page title while mounting posters along the way.
- Unfocused hub tabs do not keep `measureInWindow` polling.

## Notes

- Lazy rail mount/fetch remains in `lazy_catalog_rails.md`.
- Horizontal FlatList virtualization is used on **phone**; TV keeps `ScrollView` (focus risk).
- Detail heroes / backdrop size are out of this pack.
