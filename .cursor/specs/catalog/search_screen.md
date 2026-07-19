# Search Screen (TV)

## Description

TV search screen: query field, on-screen keyboard, media filters, popular queries, and result rails. Focus and scroll must stay usable with a D-pad.

## Requirements

1. [x] Vertical scroll stays usable with the on-screen keyboard (no oversized snap block). Search does not use catalog vertical snap — filter focus/press must not bounce the page. Focusing the search field/button restores the header only when already scrolled down.
2. [x] On-screen keyboard supports English and Russian layouts with a visible language toggle key.
3. [x] The «Найти» action shows a clear TV focus ring distinct from the idle accent fill.
4. [x] Filter chips and keyboard keys keep a visible focused state.
5. [x] Media filter chips live in a plain row (not a horizontal ScrollView) so Left/Right moves one chip at a time on TV.

## Acceptance Criteria

- After focusing a result poster, moving focus back to the query/keyboard restores the title and search row on screen.
- User can type Russian titles via the on-screen keyboard without a physical keyboard.
- Focused «Найти» is obvious at a glance (ring / scale), not only the same solid accent color.

## Notes

- Keyboard shared with login: `OnScreenKeyboard`.
- Vertical snap helpers: `src/lib/tvCatalogScroll.ts`.
