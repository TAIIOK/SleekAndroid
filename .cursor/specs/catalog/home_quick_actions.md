# Home Quick Actions

## Description

Home shows a «Быстрые действия» block after Continue Watching with D-pad-friendly links into bookmarks, lists, collections, and history. When the user has an active party room, a leading «Комната» card returns them to that session.

## Requirements

1. [x] Quick Actions renders on phone Home immediately after Continue Watching.
2. [x] Each card navigates to its destination: `/library/bookmarks`, `/library/lists`, `/library/collections`, `/history`.
3. [x] On phone, cards use the 2×2 grid with count-based empty/disabled state for bookmarks/collections.
4. [x] On TV, Home does not fetch library/history/collections solely for Quick Action counts.
5. [x] On TV, Quick Actions is hidden; feed tabs/filters are the primary Home chrome (see `tv_home_top_nav.md`).
6. [x] `/library/*` is allowed on TV (`tvRoutes`); AppShell does not redirect library destinations to history/home.
7. [x] AppShell TV path redirects run in `useEffect`, not during render.
8. [x] TV sidebar also exposes «Медиатека» (see `library_tv.md`).
9. [x] When a non-guest phone user has a valid stored `activePartyRoomId`, Quick Actions shows a leading «Комната» card before the 2×2 grid.
10. [x] The «Комната» card subtitle uses room content title (fallback room title / «Вернуться») and navigates to `/party/[roomId]`.
11. [x] Stale active room ids are cleared when `getPartyRoom` fails; guests and TV skip the party fetch.

## Acceptance Criteria

- After Continue Watching on phone Home, «Быстрые действия» is visible.
- Selecting a card opens the matching library/history screen without a React “setState while rendering” error.
- Opening Home on a release TV build still does not issue Quick Actions count requests.
- TV Home does not show Quick Actions.
- After joining a party room and returning to phone Home, «Комната» appears and opens that room.

## Notes

- Phone keeps the 2×2 grid and count-based empty/disabled state for bookmarks/collections.
- Count-fetch gating remains documented in `tv_catalog_perf.md`.
- TV Home chrome is specified in `tv_home_top_nav.md`.
- Active room persistence is shared with the party lobby banner (`activePartyRoom.ts`).
