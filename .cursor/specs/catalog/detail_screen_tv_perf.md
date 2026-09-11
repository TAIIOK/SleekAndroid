# Detail Screen TV Performance

## Description

Android TV / Fire TV detail screens (anime, movie, series) must keep D-pad focus working while mounting far fewer episode cards, stills, and related posters on the first paint. Nested episode `ScrollView` on anime TV stays forbidden (overlay of «Похожее»). Horizontal TV rails stay `ScrollView` (focus risk).

## Requirements

1. [x] TV anime episode list is a sliding window in the outer page column: initial mount 6 rows, overscan 4, spacers for unmounted rows, no nested episode `ScrollView` / `FlatList`.
2. [x] TV anime episode page size is 12 (not 24). «Ещё эпизоды» shows only after the window reaches the already-fetched end.
3. [x] TV anime episode thumbs decode at 120×72 via `expo-image`; episode cards are `React.memo`.
4. [x] TV series season episode list virtualizes with nested `FlatList` (`initialNumToRender={6}`, `windowSize={5}`); stills use `expo-image` with memory-disk cache.
5. [x] Lampa hero backdrop uses `expo-image` (`cachePolicy="memory-disk"`, `recyclingKey`, decode size), not RN `ImageBackground`.
6. [x] Anime hero backdrop passes an explicit decode width/height.
7. [x] TV related / recommendations / similar rails mount at most 12 posters.
8. [x] TV cast and characters rails mount at most 12 tiles.
9. [x] `LampaSourceSheet` mounts only while the sheet is open.
10. [x] Detail screen play / library / rail press handlers and `collectionItem` are stable (`useCallback` / `useMemo`).

## Acceptance Criteria

- Opening an anime / movie / series detail on TV paints hero + Play without mounting 24 episode rows or a full season map. Extra related/cast trees stay collapsed.
- D-pad reaches Play, the first episode, load-more, and does not skip from episodes into «Похожее».
- Left from Play / first episode still reaches the app sidebar.
- Anime TV detail does not nest an episode `ScrollView`.
- Phone anime episode `FlatList` and Lampa phone density stay unchanged.
- Movies (no seasons) only get the lighter hero, sheet, and capped rails.

## Notes

- Extends `detail_screen_perf.md` and `detail_section_collapse.md`. Extra rails are user-expanded, not viewport-lazy.
- Catalog rail cap reuses `CATALOG_RAIL_PAGE_SIZE` (12).
- Lampa `lampa-progress` / `history-feed` stay eager (Continue Watching cache + resume).
