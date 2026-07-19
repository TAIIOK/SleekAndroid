# TV Home Top Navigation

## Description

On TV, Home uses a simpler top chrome: feed tabs and content-type filters. Content below is a poster grid when exactly one feed source is active, or horizontal rails when multiple sources are active. Phone Home is unchanged.

## Requirements

1. [x] TV Home shows type filters first: «Все», «Фильмы», «Сериалы», «Аниме» (no cartoons).
2. [x] Under type filters, TV Home shows a compact feed row: «Все» + first pinned feeds + selected overflow feed + «Ещё»; full catalog feed list opens in a vertical picker sheet.
3. [x] Feed tab × type filter resolves to zero or more catalog sources (anime showcase and/or Lampa movie/tv section).
4. [x] When exactly one source is resolved, Home shows a vertically paginated poster grid.
5. [x] When two or more sources are resolved, Home shows one horizontal `PosterRail` per source.
6. [x] When zero sources are resolved, Home shows an empty state.
7. [x] Continue Watching remains above the feed chrome on TV when items exist.
8. [x] Quick Actions is not shown on TV Home (phone keeps Quick Actions).
9. [x] Feed tabs and type filters use a plain `View` row (not horizontal `ScrollView`) for reliable D-pad focus.
10. [x] Only the first chip in type-filter and feed-tab rows sets `railStart` (Left→sidebar); mid-row chips move Left within the row. Type-filter `contentEntry` (Up→sidebar) applies when Continue Watching is empty.
11. [x] Home settings sheet is reachable on TV via «Настройки лент»; feed tabs/sources follow `CatalogHomeConfig` (showcases, Lampa sections, custom anime sections) synced with Sleek/backend.
12. [x] Phone Home keeps the previous vertical stack of catalog rails.
13. [x] Default feed tab is «Все»; it shows the full set of catalog sources for the current type (nothing truncated for the filter).
14. [x] Changing the type filter rebuilds feed tabs from that type’s catalog and falls back to «Все» / first tab if the previous feed is missing.

## Acceptance Criteria

- On TV Home, the user can switch feed tabs and type filters with the remote.
- Selecting «Аниме» (or another single type) with a mapped showcase/section shows a grid, not a long stack of unrelated rails.
- Selecting «Все» with anime + lampa enabled shows horizontal rows for each resolved source.
- Continue Watching still appears above the new chrome when the user has in-progress titles.
- Quick Actions is absent on TV and still present on phone.

## Notes

- Feed options are generated from catalog APIs, then filtered by `resolveAnimeShowcaseIds` / `resolveLampaSectionEndpoints` / custom sections from the user’s home config.
- The type-filter row shows «Настройки · N» (N = enabled feeds for the current type) and opens `HomeSettingsSheet`.
- Compact row pins `TV_HOME_FEED_PIN_COUNT` feeds; «Ещё» opens a modal list so long catalogs do not wrap across many focus rows.
- «Все» is the full *enabled* source list for that type; each other option selects exactly one of those sources.
- Sidebar routes `/anime`, `/movies`, `/series` are unchanged.
