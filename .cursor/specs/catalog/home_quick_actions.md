# Home Quick Actions

## Description

Home shows a «Быстрые действия» block after Continue Watching with D-pad-friendly links into bookmarks, lists, collections, and history.

## Requirements

1. [x] Quick Actions renders on Home immediately after Continue Watching (including TV).
2. [x] Each card navigates to its destination: `/library/bookmarks`, `/library/lists`, `/library/collections`, `/history`.
3. [x] On TV, cards are a single horizontal focusable rail with brand focus ring; Left on the first card exits to the sidebar.
4. [x] On TV, Home does not fetch library/history/collections solely for Quick Action counts (static subtitles; cards stay enabled).
5. [x] When Continue Watching is empty, the first Quick Action card is the preferred content entry (`hasTVPreferredFocus` + Up→sidebar).
6. [x] `/library/*` is allowed on TV (`tvRoutes`); AppShell does not redirect library destinations to history/home.
7. [x] AppShell TV path redirects run in `useEffect`, not during render.
8. [x] TV sidebar also exposes «Медиатека» (see `library_tv.md`).

## Acceptance Criteria

- After Continue Watching on TV Home, «Быстрые действия» is visible and focusable.
- Selecting a card opens the matching library/history screen without a React “setState while rendering” error.
- Opening Home on a release TV build still does not issue Quick Actions count requests.

## Notes

- Phone keeps the 2×2 grid and count-based empty/disabled state for bookmarks/collections.
- Count-fetch gating remains documented in `tv_catalog_perf.md`.
