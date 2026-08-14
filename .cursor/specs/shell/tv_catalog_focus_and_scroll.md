# TV Catalog Focus, Sidebar Flash, and Scroll Restore

## Description

Opening a detail screen must not flash the left nav overlay. Holding Right on a playlist rail must keep focus on that rail. Back from detail must restore catalog scroll position and focused poster.

## Requirements

### Sidebar flash

1. [x] Route change parks/closes the side menu only when the top-level nav segment changes (e.g. `/` → `/movies`), not on detail push (`/movies` → `/movies/[id]`).
2. [x] Detail open does not briefly set `menuOpen` or change sidebar opacity visibly.
3. [x] Left from content on detail still opens the side menu when on a rail-edge / top entry.

### Hold-Right focus

4. [x] While a horizontal rail owns focus, Up/Down focus exit is pinned so hold-Right does not jump to adjacent rails. Continue Watching and catalog rails pin Right (trap + sibling `nextFocusRight` / hold-Right `pinVerticalFocus`) and set `nextFocusUp` / `nextFocusDown` to the previous/next rail (or page title / feed chrome). Intentional Up/Down leave the row after the pin window.
5. [x] `useTvRailFocusRestore` only re-requests focus when the same rail still owns focus after itemCount changes.
6. [x] Holding Right across pagination keeps a visible focus ring on posters in that rail.

### Scroll / focus restore

7. [x] Leaving home/catalog for a detail screen saves `scrollY`, active rail key, and item index.
8. [x] Back (POP) restores scroll offset and re-focuses the previously focused poster when possible.
9. [x] Applies to Home, Anime, Movies, and Series catalog screens.
10. [x] Anime/Movies/Series catalogs stay mounted under detail via the parent `(main)` Stack `freezeOnBlur` (no rail reload / skeleton on Back).
11. [x] TV sidebar navigate to another hub is a fresh landing: `scrollY = 0`, focus on the page title, no leftover mid-feed scroll. Phone tab switches still keep scroll (see `mobile_tab_keepalive.md`).

## Acceptance Criteria

- Opening a movie/series/anime detail does not flash the left nav.
- Hold Right on a long playlist does not jump focus to the playlist above or below.
- Rapid Right in Home Continue Watching stays on that rail and does not jump to type filters, feed tabs, or catalog rails below.
- Intentional Up/Down from Continue Watching and from Anime / Movies / Series rails move to the previous/next row (or the page title).
- Back from detail returns to the same vertical position and focused card.
- TV sidebar OK on Аниме / Фильмы / Сериалы lands at the top of that hub (title focused). Back from a title still restores the previous catalog offset.

## Notes

- Related: `tv_focus_navigation.md`, `AppShell` parkSidebarFocus, `useTvRailFocusRestore`, catalog `ScrollView`s.
- Parking is gated by `topLevelNavKey` / `shouldParkSidebarOnRouteChange` in `src/lib/tvSidebarHandoff.ts`. Same-hub detail push only resets Left/Up arms (`resetExitArms`); it does not park, close the overlay, or clear `contentNativeTag`.
- Detail routes (`isMobileDetailRoute`) have no closed-menu sidebar anchor. The active hub row still registers as the HW Left/Up target (`isHwAnchor`) so Play `railStart` / `contentEntry` can open the menu. Loading skeletons expose a TV preferred-focus trap so D-pad does not fall through while the title loads.
