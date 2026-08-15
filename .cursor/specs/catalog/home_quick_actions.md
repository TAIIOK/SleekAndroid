# Home Quick Actions

## Description

Home shows a «Быстрые действия» block after Continue Watching with D-pad-friendly links into library, history, and other sections. Phone keeps a fixed 2×2 grid. TV shows a horizontal rail whose cards the user can toggle and reorder in Home settings. When the user has an active party room, a leading «Комната» card returns them to that session on phone.

## Requirements

1. [x] Quick Actions renders on phone Home immediately after Continue Watching.
2. [x] Phone cards navigate to `/library/bookmarks`, `/library/lists`, `/library/collections`, `/history`.
3. [x] On phone, cards use the 2×2 grid with count-based empty/disabled state for bookmarks/collections.
4. [x] On TV, Home does not fetch library/history/collections solely for Quick Action counts.
5. [x] On TV, Quick Actions renders as a horizontal rail after Continue Watching (below type filters / feed tabs). Default cards match phone: bookmarks, lists, collections, history.
6. [x] `/library/*` is allowed on TV (`tvRoutes`); AppShell does not redirect library destinations to history/home.
7. [x] AppShell TV path redirects run in `useEffect`, not during render.
8. [x] TV sidebar also exposes «Медиатека» (see `library_tv.md`).
9. [x] When a non-guest phone user has a valid stored `activePartyRoomId`, Quick Actions shows a leading «Комната» card before the 2×2 grid.
10. [x] The «Комната» card subtitle uses room content title (fallback room title / «Вернуться») and navigates to `/party/[roomId]`.
11. [x] Stale active room ids are cleared when `getPartyRoom` fails; guests and TV skip the party fetch.
12. [x] TV Home settings include a «Быстрые действия» group: toggle visibility and reorder cards. Extra destinations (search, schedule, friends, profile, anime, movies, series, party) are off by default.
13. [x] TV Quick Action order/visibility persist locally and apply on the next Home render. An empty selection hides the rail.
14. [x] TV Quick Actions is a catalog rail for D-pad: Left on the first card opens the sidebar; Up from a card focuses «Настроить»; Up from «Настроить» goes to Continue Watching or feed chrome; Down from «Настроить» or a card goes to the first catalog poster / first Quick Action card. The section header «Настроить» opens Home settings.

## Acceptance Criteria

- After Continue Watching on phone Home, «Быстрые действия» is visible.
- Selecting a card opens the matching library/history screen without a React “setState while rendering” error.
- Opening Home on a release TV build still does not issue Quick Actions count requests.
- After Continue Watching on TV Home, the default four Quick Action cards are visible and open their destinations.
- Saving a custom set in Home settings changes which cards appear and in which order; turning all off hides the rail.
- After joining a party room and returning to phone Home, «Комната» appears and opens that room.

## Notes

- Phone keeps the 2×2 grid and count-based empty/disabled state for bookmarks/collections.
- Count-fetch gating remains documented in `tv_catalog_perf.md`.
- TV Home chrome is specified in `tv_home_top_nav.md`.
- Active room persistence is shared with the party lobby banner (`activePartyRoom.ts`).
- TV Quick Action prefs are device-local (`sleek_tv_home_quick_actions`), not part of synced `catalogHomeConfig`.
