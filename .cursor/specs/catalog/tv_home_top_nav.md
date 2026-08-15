# TV Home Top Navigation

## Description

On TV, Home uses desktop-parity chrome: a content-type segmented control and underline feed tabs. Content below is a poster grid when exactly one feed source is active, or horizontal rails when multiple sources are active. Phone Home is unchanged.

## Requirements

1. [x] TV Home shows type filters first as a segmented control: «Все», «Фильмы», «Сериалы», «Аниме» (no cartoons). Active segment uses the primary-container fill (`#4f46e5`) and white label.
2. [x] Under type filters, TV Home shows every feed as an underline tab in one horizontal row (no compact pin row, no «Ещё» picker).
3. [x] Feed tab × type filter resolves to zero or more catalog sources (anime showcase and/or Lampa movie/tv section).
4. [x] When exactly one source is resolved, Home shows a vertically paginated poster grid.
5. [x] When two or more sources are resolved, Home shows one horizontal `PosterRail` per source.
6. [x] When zero sources are resolved, Home shows an empty state.
7. [x] Continue Watching sits below the feed chrome on TV (desktop parity) when items exist.
8. [x] Quick Actions is shown on TV Home after Continue Watching as a configurable rail (see `home_quick_actions.md`). Phone keeps the fixed 2×2 grid.
9. [x] Type filters use a plain `View` row (not horizontal `ScrollView`). Feed tabs use a horizontal `ScrollView` with `tvHorizontalCatalogScrollProps` so D-pad focus scrolls overflow into view.
10. [x] Only the first control in type-filter and feed-tab rows sets `railStart` (Left→sidebar); mid-row items move Left within the row. The first type-filter pins `nextFocusLeft` to an in-row dest (same focus guide) so Left cannot 2D-search Down into feed tabs. The search icon and last feed tab set `railEnd` so Right does not 2D-search into Continue Watching. Type-filter `contentEntry` (Up→sidebar) always applies because filters are the top chrome. Continue Watching cards are not the content entry. Rapid / hold Right inside Continue Watching stays on that rail (`trapFocusRight` + sibling `nextFocusRight` + steal-back). Intentional Up uses `nextFocusUp` to feed tabs (or type filters); Down uses `nextFocusDown` to the first catalog poster.
11. [x] Home settings sheet is reachable on TV via a gear icon beside the type segmented control; a search icon to the right of the gear opens `/search`. Feed tabs/sources follow `CatalogHomeConfig` (showcases, Lampa sections, custom anime sections) synced with Sleek/backend.
12. [x] Phone Home keeps the previous vertical stack of catalog rails.
13. [x] Default feed tab is «Все»; it shows the full set of catalog sources for the current type (nothing truncated for the filter).
14. [x] Changing the type filter rebuilds feed tabs from that type’s catalog and falls back to «Все» / first tab if the previous feed is missing.
15. [x] Available type filters follow `resolveEnabledHomeSections` so «Фильмы» and «Сериалы» appear independently.
16. [x] TV Home source set and block order match desktop `listTvHomeCatalogSources`: overlay `enabledTypes` onto `resolveEnabledHomeSections`, and use that section list (not a hardcoded anime/movie/tv sequence) when the type filter is not «Все».
17. [x] TV `/movies` and `/series` browse filter and order Lampa rails via `resolveLampaSectionEndpoints` (config order), same as site `LampaKindSections`.
18. [x] TV Home applies server `catalogHomeConfig` whenever the GET payload parses as a real config (string `data` included). Local cache must not overwrite the server on startup.
19. [x] TV Home catalog rails use `LazyCatalogRail` with `deactivateWhenFar`. The first two item fetches start immediately; later rails wait for the viewport (no stagger-all timer). Loading keeps the title; a successful empty response hides the row; fetch errors stay visible. Far rails unmount poster trees and keep a measured placeholder so Down still lands on the next mounted row.
20. [x] TV Home source items load like desktop `useHomeFeedSource`: `fetchAnimeList` / `fetchLampaSection` / `fetchLampaSectionByUrlPath` without swallowing recommendation errors as `[]` and without extra `filterLampaItemsByKind`.
21. [x] TV Home personal anime rails load from `/api/v2/catalog/recommendations/anime` the same way as phone `AnimeCatalogRails` (full feed, then pick the section). Duplicate recommendation sections are merged. Lampa rec rails decode with the same merge.

## Acceptance Criteria

- On TV Home, the user can switch feed tabs and type filters with the remote.
- Selecting «Аниме» (or another single type) with a mapped showcase/section shows a grid, not a long stack of unrelated rails.
- Selecting «Все» with anime + lampa enabled shows horizontal rows for each resolved source.
- Unconfigured home + enabled anime/lampa types still yields rails in default block order `movie → tv → anime` (desktop parity).
- Continue Watching still appears below the type/feed chrome when the user has in-progress titles.
- Rapid Right across Continue Watching does not move focus up to type filters / feed tabs or down to other catalog rails.
- Left on the first type-filter, first feed tab, or first Continue Watching card opens the sidebar; it does not drop into the row below.
- Quick Actions is present on TV after Continue Watching and still present on phone.
- Type chrome matches desktop: segmented control plus settings gear; feed chrome matches desktop underline tabs with every enabled feed visible.
- After login, Home rails and tab order match the website for the same account (server catalogHomeConfig), not a stale TV cache.
- TV Home keeps section titles in the slot; far rails unmount posters and reserve last measured height. Item requests for rails below the first two wait until the row is near the viewport (no timer that loads the whole feed).

## Notes

- Feed options are generated from catalog APIs, then filtered by `resolveAnimeShowcaseIds` / `resolveLampaSectionEndpoints` / custom sections from the user’s home config.
- The type-filter row opens `HomeSettingsSheet` from the gear (`settings-outline`) and `/search` from the search icon; TV has no desktop top bar.
- Overflow feeds stay in the same underline row and scroll horizontally under D-pad focus.
- «Все» is the full *enabled* source list for that type; each other option selects exactly one of those sources.
- Sidebar routes `/anime`, `/movies`, `/series` apply the same `resolveLampaSectionEndpoints` filter and order as the site (`LampaKindSections`), not the raw API section list.
- Site parity: `HomeTypeFilters` / `HomeFeedTabs` desktop branches in the web app. Source resolution matches desktop `listTvHomeCatalogSources` (same overlay of catalog `enabledTypes` and `homeSectionOrder`).
- Server `GET /api/user/catalogHomeConfig` wins over AsyncStorage on startup; `persist()` is the only path that writes settings back.
- TV Home source items use the same fetch functions as desktop `useHomeFeedSource` (`fetchAnimeList`, `fetchLampaSection`, `fetchLampaSectionByUrlPath`). Recommendation errors are not turned into empty lists.
- TV Home wraps catalog rows in `LazyCatalogRail` (same keep/prefetch band as browse). Item fetches for the first two rails start immediately; the rest wait for the viewport. Browse (Anime / Movies / Series) does the same: only page-top rails are `eager` (Anime: seasonal; Movies/Series: first two Lampa sections).
