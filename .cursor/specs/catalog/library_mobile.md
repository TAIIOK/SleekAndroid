# Library (Медиатека) Mobile

## Description

Phone UX for Медиатека hub (`/library/*`): stable chrome, readable pills, responsive poster grid with «Показать ещё», and clear Anime / Movies / Series separation.

## Requirements

1. [x] Phone library hub does not show a «← Назад» control; title «Медиатека» + hub tabs remain.
2. [x] Active hub tabs and status chips use light on-surface text (`colors.text`) on brand fill — not dark `brandOn` or pale `brandTint`.
3. [x] On `/library` and `/library/*`, overlay chrome is used (content scrolls under islands) and the floating top island slides away with vertical scroll (same as home/catalog).
4. [x] Hub title + tabs are normal page content before category filters (no absolute/overlay); they scroll with the page body.
5. [x] Poster grids in lists / bookmarks / collection detail use fluid `usePosterGridCardWidth` (not fixed 120px rail width).
6. [x] Each visible category/section pages itself (page size 12 + «Показать ещё (N)» under that section); counts reset when media/status (or selected collection) changes.
7. [x] Lists screen exposes segmented media filter: Все / Аниме / Фильмы / Сериалы.
8. [x] When media is «Все», films and series render as separate sections (not one «Фильмы и сериалы» bucket).

## Acceptance Criteria

- Opening Медиатека on phone shows no back link above the title.
- Selected Списки/Закладки/Коллекции and status pills are readable (light text on brand).
- Scrolling lists moves the top island off-screen with the content; Медиатека title/tabs scroll with the body under the glass capsules, with no solid nav/tab gutters.
- Posters fill even columns; lists longer than 12 items show «Показать ещё».
- Films and series are filterable and, under «Все», appear in distinct sections.

## Notes

- TV focus/sidebar behavior stays under `library_tv.md`.
- Site parity: `MediaLibraryPage` page size 12 + media segmented control.
