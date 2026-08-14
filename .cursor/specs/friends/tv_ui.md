# Friends TV UI

## Description

TV remote access to Друзья: sidebar entry, hub tabs, feed/list/request rows, and other-user profiles with D-pad focus and Left→sidebar exit.

## Requirements

1. [x] TV sidebar includes «Друзья» (`/friends/feed`); any `/friends/*` or `/users/*` route marks that item active.
2. [x] Friends hub tabs (Лента / Друзья / Заявки) are focusable with brand focus ring in a plain row (not horizontal `ScrollView`).
3. [x] Active hub tab is the preferred content entry (`hasTVPreferredFocus` + Left/Up→sidebar); only the first tab is `railStart`.
4. [x] Feed, friends-list, and request rows use `TvFocusable` with a visible focused state (not bare `Pressable`).
5. [x] Nickname search `TextInput` pins `nextFocusRight` / `nextFocusDown` to «Найти» and shows a focused style; it is not the preferred content entry.
6. [x] Other-user profile tabs use the same entry flags as hub tabs (`hasTVPreferredFocus` on active, `railStart` on first).
7. [x] Opening `/users/[id]` from `/friends/*` does not park the sidebar as a hub switch.

## Acceptance Criteria

- From the TV sidebar, OK on «Друзья» opens the feed; focus lands on the hub tabs.
- D-pad moves across tabs and rows one at a time; Left from the first tab returns to the sidebar and highlights «Друзья».
- OK on a feed/list/request row opens the matching profile or activity target.
- Opening a friend's profile from the hub does not flash the sidebar overlay.
- Phone friends hub (tabs, feed taps, nickname search) is unchanged.

## Notes

- Phone More menu already links to Друзья; this spec covers TV shell + in-screen focus.
- Routes stay `/friends/feed`, `/friends/list`, `/friends/requests`.
