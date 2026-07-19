# Library (Медиатека) TV

## Description

TV remote access to Медиатека: sidebar entry, hub tabs, filters, and poster grids with D-pad focus and Left→sidebar exit.

## Requirements

1. [x] TV sidebar includes «Медиатека» (`/library/lists`); any `/library/*` route marks that item active.
2. [x] Library hub tabs (Списки / Закладки / Коллекции) and back control are focusable with brand focus ring.
3. [x] Active hub tab is the preferred content entry (`hasTVPreferredFocus` + Left/Up→sidebar).
4. [x] Lists media/status chips use `TvFocusable` in a plain row (not horizontal `ScrollView`) so Left/Right moves one chip at a time (no `railStart` on nested chips).
5. [x] First poster in lists/bookmarks grids is `railStart` + `contentEntry` when the hub is not the sole entry.
6. [x] Collections list/actions use focusable controls with visible focused state.
7. [x] `MyListsContent` imports `Platform` so TV section accents do not crash the screen.

## Acceptance Criteria

- From the TV sidebar, OK on «Медиатека» opens lists; focus lands on the hub tabs.
- D-pad moves across tabs, filters, and posters; Left from the first focusable returns to the sidebar.
- Quick Actions → bookmarks/lists/collections still open without redirect away from `/library/*`.

## Notes

- Phone More menu already links to Медиатека; this spec covers TV shell + in-screen focus.
- Profile chip nickname fallback must not say «Медиатека» (use «Гость»).
