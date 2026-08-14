# Search Screen (TV)

## Description

TV search screen: query field with the system IME, voice search, media filters, recent search history, popular queries, and result rails. Focus and scroll must stay usable with a D-pad.

## Requirements

1. [x] Vertical scroll stays usable with the system keyboard (no oversized snap block). Search does not use catalog vertical snap — filter focus/press must not bounce the page. Focusing the search field/button restores the header only when already scrolled down.
2. [x] The search field is a `TextInput` that opens the system IME (`showSoftInputOnFocus`). The in-app `OnScreenKeyboard` is not rendered on search.
3. [x] The «Найти» action shows a clear TV focus ring distinct from the idle accent fill.
4. [x] Filter chips keep a visible focused state.
5. [x] Media filter chips live in a plain row (not a horizontal ScrollView) so Left/Right moves one chip at a time on TV.
6. [x] Search filters match the site: shared sort/order/year; anime genre/status/type/season/age/ratingMin; lampa genre/status/rating/lang/country — all sent on `/api/catalog/search`.
7. [x] On TV, pressing OK on the focused search field shows the system keyboard; starting a search dismisses it (D-pad focus alone must not reopen it).
8. [x] «Смотреть все» shows a clear TV focus ring.
9. [x] Search «see all» grid uses rail-sized posters and the shared poster grid column layout (not oversized fluid tiles).
10. [x] Recent search history is stored locally (AsyncStorage), shown as chips above popular queries when non-empty, capped (most recent first, case-insensitive dedupe).
11. [x] A successful search (query length ≥ 2) prepends the query to history.
12. [x] User can clear the entire search history from the search screen; chips re-run that query when pressed.
13. [x] A microphone button next to the search field launches Android `RecognizerIntent` (`android.speech.action.RECOGNIZE_SPEECH`, `ru-RU`). The first result fills the field and runs search.
14. [x] Media/genre/year filters live behind a «Фильтры» button that opens a right-side overlay sidebar over the search page (does not push layout or split the screen).
15. [x] Closing the filters sidebar re-runs search when `q.length ≥ 2` or any active filters allow browse.
16. [x] Long filter lists use dropdown selects (not pill grids), including year and genres.
17. [x] On TV, Down from the search field / microphone / «Найти» / «Фильтры» moves into «Недавние» chips, otherwise into «Популярные запросы» — never into the hidden sidebar anchor.
18. [x] If no speech recognizer is installed, the screen shows «Голосовой поиск недоступен на этом устройстве». Cancelling voice input does not change the query.

## Acceptance Criteria

- Filters are not always stacked above results; they open as an overlay sidebar from «Фильтры».
- System IME hides after search and reopens from the query field (OK on the remote).
- User can type Russian titles via the system keyboard without a physical keyboard.
- Focused «Найти» is obvious at a glance (ring / scale), not only the same solid accent color.
- After a search, the keyboard stays hidden until the search field is pressed again.
- Focused «Смотреть все» is visually distinct.
- After searching, the query appears in «Недавние»; pressing a history chip runs that search again.
- «Очистить» removes all history chips from the screen.
- Microphone launches system voice input; a successful utterance runs the same catalog search as «Найти».
- With recent history visible, Down from the search row focuses a history chip (not the sidebar).

## Notes

- Login still uses `OnScreenKeyboard` (memoized + short press lock for Android TV double `onPress`).
- Voice helper: `src/lib/tvVoiceSearch.ts` via `expo-intent-launcher`.
- Vertical snap helpers: `src/lib/tvCatalogScroll.ts`.
- History module: `src/lib/searchHistory.ts`.
