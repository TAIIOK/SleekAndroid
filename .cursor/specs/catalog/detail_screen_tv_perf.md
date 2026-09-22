# Detail Screen TV Performance

## Description

Android TV / Fire TV detail screens (anime, movie, series) must keep D-pad focus working while mounting far fewer episode cards, stills, and related posters on the first paint. Nested episode `ScrollView` on anime TV stays forbidden (overlay of «Похожее»). Horizontal TV rails stay `ScrollView` (focus risk). The second wave cuts the first-open data tax and GPU cost without a library swap.

## Requirements

1. [x] TV anime episodes are poster cards for one page of 12. «Дальше» replaces that page; unmounted episodes do not keep spacer height. No nested episode `ScrollView` / `FlatList`.
2. [x] TV anime episode page size is 12 (not 24). The next page loads only when «Дальше» reaches the end of the episodes already fetched.
3. [x] TV anime episode thumbs decode at the card size via `expo-image`; episode cards are `React.memo`.
4. [x] TV series season episode list stays an outer-column sliding window (no nested `FlatList` / `ScrollView` on TV). Phone keeps the nested `FlatList`. Stills use `expo-image` with memory-disk cache.
5. [x] Lampa hero backdrop uses `expo-image` (`cachePolicy="memory-disk"`, `recyclingKey`, decode size), not RN `ImageBackground`.
6. [x] Anime hero backdrop passes an explicit decode width/height.
7. [x] TV related / recommendations / similar rails mount at most 12 posters.
8. [x] TV cast and characters rails mount at most 12 tiles.
9. [x] `LampaSourceSheet` mounts only while the sheet is open.
10. [x] Detail screen play / library / rail press handlers and `collectionItem` are stable (`useCallback` / `useMemo`).
11. [x] Detail library status reads the existing React Query library cache. A cold cache fetches library rows without embedding full anime/lampa objects. Phone library screens keep their full `include` fetch.
12. [x] Lampa detail progress uses id aliases from the loaded detail (`routeId`, `objectId`, TMDB id) via `lampaIds`. The unfiltered `lampa-progress` list is read only when that narrow fetch is empty and the full list is already in cache. `history-feed` runs only when progress has no resume fields.
13. [x] Anime resume comes from the first accumulated episode page. There is no separate `anime-resume-episode` query.
14. [x] Lampa detail paints the backend payload first. TMDB merge lands in the same query via a follow-up write and does not block the hero.
15. [x] Episode list state omits `video[]` until dubbing selection or Play needs sources.
16. [x] The TV series season window shifts only when focus leaves the mounted overscan, not on every D-pad step inside it. Anime episodes change page only from «Назад» / «Дальше».
17. [x] TV heroes use one scrim gradient, no title `textShadow`, and a backdrop decode no taller than the hero.
18. [x] Person hero does not use `ImageBackground` `blurRadius`. It uses the same solid scrim gradient as a title hero.
19. [x] Detail sections (Play, episodes, preview rails, «Смотреть все») register in the catalog vertical focus graph with explicit `nextFocusUp` / `nextFocusDown`. Left from Play and the first card still reaches the sidebar. `railStart` is not set on «Смотреть все».
20. [x] Actors, characters, related, recommendations, and similar each show one page of at most 12 items. When more items exist, «Смотреть все» opens `/detail-list` with the rest of that fetched list. These sections are not collapsible bars.

## Acceptance Criteria

- Opening an anime / movie / series detail on TV paints hero + Play without mounting 24 episode rows or a full season map. Related, recommendations, similar, and cast each show one page after the hero settles. «Смотреть все» opens the rest.
- Opening a detail does not download the full embedded library, an unfiltered Lampa progress list, or a 100-row history feed when resume fields are already known.
- D-pad reaches Play, the first episode card, and «Дальше», and does not skip from episodes into «Похожее».
- «Продолжить» and an episode card open `/watch/anime/...` without waiting for a resolved stream URL.
- Left from Play / first episode still reaches the app sidebar. Down from Play lands on episodes or the next section, not a random 2D jump.
- Anime TV detail does not nest an episode `ScrollView`. Series TV detail does not nest a season `FlatList`.
- Phone anime episode `FlatList` and Lampa phone density stay unchanged.
- Movies (no seasons) only get the lighter hero, sheet, and capped rails.
- Stepping D-pad inside the mounted series episode window does not unmount those cards. Anime detail stays one episode page tall.

## Notes

- Extends `detail_screen_perf.md` and `detail_section_collapse.md`. Extra rails are user-expanded, not viewport-lazy.
- Catalog rail cap reuses `CATALOG_RAIL_PAGE_SIZE` (12).
- Unfiltered `lampa-progress` remains valid for Continue Watching. Detail must not issue it on its own when a narrow alias fetch or an existing cache row is enough.
- TV rails stay `ScrollView`. The focus window lives inside that ScrollView.
