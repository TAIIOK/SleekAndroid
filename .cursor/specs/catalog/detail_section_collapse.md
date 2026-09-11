# Detail Section Collapse

## Description

Anime and Lampa (movies/series) detail screens keep the hero, Play, and a small episode window mounted. Characters/cast and related poster rails stay collapsed until the user opens them. Only one extra section is expanded at a time; the previous section unmounts.

## Requirements

1. [x] Collapsed extra sections render only a focusable header (no posters, stills, or nested rails).
2. [x] Expanding a section mounts its content and starts its query; collapsing unmounts children.
3. [x] Extra sections are exclusive: opening one closes and unmounts the previous (`characters` | `related` | `recommendations` | `similar`).
4. [x] Hero + episode/season list stay mounted; duplicate body plot under the hero is removed (overview lives in the hero aside).
5. [x] Related / similar / recommendations / characters / cast queries are `enabled` only while that section is open (anime related+recommendations share one fetch).
6. [x] Lampa «Связанные» header is omitted when the title has no TMDB collection.
7. [x] Empty open sections show «Нет данных»; loading shows «Загрузка…».
8. [x] TV: Left from a section header reaches the app sidebar; Play remains preferred focus.

## Acceptance Criteria

- Opening a detail screen paints hero + Play + episode window without mounting characters/cast or related poster trees.
- Related/similar/cast/characters requests do not fire until the user opens that header.
- Opening «Похожее» unmounts «Персонажи» / «Актёры» if it was open.
- TV D-pad still reaches Play, episodes, load-more, and collapsed headers; Left from Play / first episode / section headers reaches the sidebar.

## Notes

- Replaces `LazyCatalogRail` on detail extra sections (`detail_screen_perf.md`).
- TV episode sliding window is in `detail_screen_tv_perf.md`.
