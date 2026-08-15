# Library (Медиатека) TV

## Description

TV remote access to Медиатека: sidebar entry, hub tabs, filters, and poster grids with D-pad focus and Left→sidebar exit.

## Requirements

1. [x] TV sidebar includes «Медиатека» (`/library/lists`); any `/library/*` route marks that item active.
2. [x] Library hub tabs (Списки / Закладки / Коллекции) and media type chips use the home segmented control (shared track, `radii.sm` tabs — not pills) and stay focusable with brand focus ring.
3. [x] Active hub tab is the preferred content entry (`hasTVPreferredFocus` + Left/Up→sidebar).
4. [x] Lists media/status chips use `TvFocusable` in a plain row (not horizontal `ScrollView`) so Left/Right moves one chip at a time (no `railStart` on nested chips).
5. [x] First poster in lists/bookmarks grids is `railStart` + `contentEntry` when the hub is not the sole entry.
6. [x] Collections list/actions use focusable controls with visible focused state.
7. [x] `MyListsContent` imports `Platform` so TV section accents do not crash the screen.
8. [x] Hub title «Медиатека» has TV-only `paddingTop` (`spacing.xl`) so it is not flush with the content top.
9. [x] Analytics is collapsed by default: title + toggle + one row of six compact stat cards; «Показать больше» reveals the status bars.
10. [x] Collections tab renders a compact wrap grid of `LibraryCollectionCard` (cover + name + count). Lists does not duplicate a collections preview — hub tab is the entry.

## Acceptance Criteria

- From the TV sidebar, OK on «Медиатека» opens lists; focus lands on the hub tabs.
- D-pad moves across tabs, filters, and posters; Left from the first focusable returns to the sidebar.
- Quick Actions → bookmarks/lists/collections still open without redirect away from `/library/*`.
- Медиатека title has visible top padding on TV.
- Analytics opens collapsed with one row of primary stat cards; OK on the toggle expands extra stats and bars.
- Collection entries on the Коллекции tab are compact cards in a wrap grid (about 4 per row on TV).

## Notes

- Phone More menu already links to Медиатека; this spec covers TV shell + in-screen focus.
- Profile chip nickname fallback must not say «Медиатека» (use «Гость»).
