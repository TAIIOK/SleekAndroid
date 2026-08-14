# Mobile Tab Keep-Alive

## Description

Phone bottom-bar hubs (Home, Anime, Movies, Series) must keep already-visited screens mounted when switching tabs so catalog content and scroll position are not remounted/reloaded. Phone browse hubs mount item rails only when near the viewport.

## Requirements

1. [x] Home, Anime, Movies, and Series are siblings under an Expo Router `Tabs` navigator (custom AppShell tab bar; default tab bar hidden).
2. [x] Visited hub tabs stay mounted across switches (`lazy` first visit, `detachInactiveScreens={false}`).
3. [x] Switching between those hubs on phone does not remount the previous hub or show a full catalog skeleton reload.
4. [x] Scroll offset and already-activated visible rails on a visited hub remain after leaving and returning.
5. [x] Catalog → detail → Back pops the parent `(main)` Stack (`freezeOnBlur`) so the hub catalog stays mounted and does not reload.
6. [x] Tapping the already-active hub while a detail screen is open navigates to that hub’s catalog root.
7. [x] On phone browse (Anime / Movies / Series), item rails mount and fetch only when near the viewport via `LazyCatalogRail` / `useNearViewport`; section metadata may load eagerly.
8. [x] Home → anime/movie/series detail → Back returns to Home (detail is not nested inside the destination hub tab).

## Acceptance Criteria

- Phone: Home → Anime → Movies → Series → Home keeps previously loaded content and scroll without a full reload flash.
- Phone: Anime → title detail → Back leaves the anime catalog mounted as before.
- Phone: Home → series (or movie/anime) detail → Back returns to Home, not the series/movies/anime tab.
- Phone browse: only near-viewport item queries run until the user scrolls further.
- Hub URLs remain `/`, `/anime`, `/movies`, `/series` (route groups do not appear in the path).

## Notes

- TV also uses the same `(tabs)` group; sidebar `navigate` and snapshot clear-on-hub-switch stay as today.
- AppShell bottom capsule remains the visible phone tab UI (`tabBar: () => null` on Tabs).
- Title detail files live at `(main)/anime|[movies]|series/[id].tsx`; hub catalogs are `(tabs)/anime.tsx` (etc.) so `push('/series/:id')` from Home does not select the Series tab.
