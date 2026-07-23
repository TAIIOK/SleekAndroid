# TV Catalog Focus, Sidebar Flash, and Scroll Restore

## Description

Opening a detail screen must not flash the left nav overlay. Holding Right on a playlist rail must keep focus on that rail. Back from detail must restore catalog scroll position and focused poster.

## Requirements

### Sidebar flash

1. [x] Route change parks/closes the side menu only when the top-level nav segment changes (e.g. `/` → `/movies`), not on detail push (`/movies` → `/movies/[id]`).
2. [x] Detail open does not briefly set `menuOpen` or change sidebar opacity visibly.
3. [x] Left from content on detail still opens the side menu when on a rail-edge / top entry.

### Hold-Right focus

4. [x] While a horizontal rail owns focus, Up/Down focus exit is pinned so hold-Right does not jump to adjacent rails.
5. [x] `useTvRailFocusRestore` only re-requests focus when the same rail still owns focus after itemCount changes.
6. [x] Holding Right across pagination keeps a visible focus ring on posters in that rail.

### Scroll / focus restore

7. [x] Leaving home/catalog for a detail screen saves `scrollY`, active rail key, and item index.
8. [x] Back (POP) restores scroll offset and re-focuses the previously focused poster when possible.
9. [x] Applies to Home, Anime, Movies, and Series catalog screens.
10. [x] Anime/Movies/Series use a nested Stack so the catalog stays mounted under detail (no rail reload / skeleton on Back).

## Acceptance Criteria

- Opening a movie/series/anime detail does not flash the left nav.
- Hold Right on a long playlist does not jump focus to the playlist above or below.
- Back from detail returns to the same vertical position and focused card.

## Notes

- Related: `tv_focus_navigation.md`, `AppShell` parkSidebarFocus, `useTvRailFocusRestore`, catalog `ScrollView`s.
