# Search Screen (TV)

## Description

TV search screen: query field, on-screen keyboard, media filters, recent search history, popular queries, and result rails. Focus and scroll must stay usable with a D-pad.

## Requirements

1. [x] Vertical scroll stays usable with the on-screen keyboard (no oversized snap block). Search does not use catalog vertical snap — filter focus/press must not bounce the page. Focusing the search field/button restores the header only when already scrolled down.
2. [x] On-screen keyboard supports English and Russian layouts with a visible language toggle key.
3. [x] The «Найти» action shows a clear TV focus ring distinct from the idle accent fill.
4. [x] Filter chips and keyboard keys keep a visible focused state.
5. [x] Media filter chips live in a plain row (not a horizontal ScrollView) so Left/Right moves one chip at a time on TV.
6. [x] Anime filters include genre and year chips; values are sent as `genre` / `year` on `/api/catalog/search`.
7. [x] On TV, the on-screen keyboard is rendered directly under the search row (before filters). Pressing the search field shows the keyboard; starting a search hides it (focus alone must not reopen it).
8. [x] «Смотреть все» shows a clear TV focus ring.
9. [x] Search «see all» grid uses rail-sized posters and the shared poster grid column layout (not oversized fluid tiles).
10. [x] Recent search history is stored locally (AsyncStorage), shown as chips above popular queries when non-empty, capped (most recent first, case-insensitive dedupe).
11. [x] A successful search (query length ≥ 2) prepends the query to history.
12. [x] User can clear the entire search history from the search screen; chips re-run that query when pressed.

## Acceptance Criteria

- After focusing a result poster, moving focus back to the query/keyboard restores the title and search row on screen.
- User can type Russian titles via the on-screen keyboard without a physical keyboard.
- Focused «Найти» is obvious at a glance (ring / scale), not only the same solid accent color.
- On TV, the keyboard sits immediately below the search field, not below the filter chips.
- After a search, the keyboard stays hidden until the search field is pressed again.
- Focused «Смотреть все» is visually distinct.
- After searching, the query appears in «Недавние»; pressing a history chip runs that search again.
- «Очистить» removes all history chips from the screen.

## Notes

- Keyboard shared with login: `OnScreenKeyboard`.
- Vertical snap helpers: `src/lib/tvCatalogScroll.ts`.
- History module: `src/lib/searchHistory.ts`.
