# Detail Screen Performance

## Description

Anime and Lampa (movies/series) detail screens must paint the hero and Play control first. Below-fold related rails, cast/characters, and extra TMDB/Aniverse fetches must not contend with the first frame. Catalog lazy-rail patterns apply here too.

## Requirements

1. [x] Related, similar, recommendations, characters, cast, and Lampa ratings queries start only after `InteractionManager.runAfterInteractions` (hero paint). Play/resume/progress/episodes page 1 stay eager.
2. [x] Pending related-rail skeletons do not mount while those queries are still disabled.
3. [x] Characters, cast, and the three related poster rails (`Связанные` / `Рекомендации` / `Похожее`) mount through `LazyCatalogRail` and unmount when they leave the keep band.
4. [x] Detail vertical `ScrollView` calls `notifyViewportScroll` on scroll (`scrollEventThrottle={64}`) so `useNearViewport` is not poll-only.
5. [x] Lampa TV hero backdrop uses TMDB `w780`, not `original`.
6. [x] Anime hero backdrop uses `expo-image` with `cachePolicy="memory-disk"` and `recyclingKey` (not RN `ImageBackground`).
7. [x] `fetchLampaRelated` uses `belongs_to_collection.id` from the already-loaded detail when present and does not re-fetch TMDB detail in that case.
8. [x] Phone anime episode rail virtualizes with `FlatList` (`initialNumToRender={6}`, `windowSize={5}`). TV episode list stays a plain column (see `detail_screens.md`).

## Acceptance Criteria

- Opening an anime / movie / series detail paints hero + Play without mounting the three related poster trees.
- Related/similar/cast/characters/ratings requests do not fire on the first frame.
- Scrolling toward related rails mounts posters; empty lists still hide their blocks.
- TV D-pad still reaches Play, episodes, and load-more; Left from Play still reaches the app sidebar.
- Lampa TV backdrop URL contains `w780`, not `original`.

## Notes

- Reuses `LazyCatalogRail` / `useNearViewport` from `lazy_catalog_rails.md`.
- Catalog pack `tv_catalog_perf.md` left detail heroes out of scope; this spec covers them.
- TV episode virtualization is out of this pack (focus risk).
