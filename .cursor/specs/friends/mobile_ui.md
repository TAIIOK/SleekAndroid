# Friends Mobile UI

## Description

Phone UX for the Friends hub (`/friends/*`): shared chrome with active tabs, readable lists, compact activity feed, and clear empty/loading states.

## Requirements

1. [x] Phone friends hub shows title «Друзья» plus a full tab row: Лента / Друзья / Заявки.
2. [x] Active hub tab uses brand fill with light on-surface text (`colors.text`), matching Медиатека pills.
3. [x] «Заявки» tab shows an incoming-request count badge when pending inbound invites exist.
4. [x] On `/friends/*` and `/users/*`, overlay app nav scrolls away with content; page header (title/tabs) scrolls with the body.
5. [x] Feed items use a compact horizontal activity row (avatar + text + optional poster thumb), not tall stacked cards.
6. [x] Feed actor tap opens profile; media area tap opens the activity target — without nested focusable cards.
7. [x] Friends list keeps search/add on `/friends/list`, visually separated from «Ваши друзья».
8. [x] Empty and loading states use icon+hint empty UI and skeletons (not a single muted line).
9. [x] List/request rows share consistent avatars and action hierarchy (accept = brand, decline/remove = secondary).
10. [x] On `/friends/*` and `/users/*`, top app nav uses overlay scroll-away (not fixed shell); page header scrolls with content.

## Acceptance Criteria

- Opening Друзья on phone shows «Друзья» + three tabs with the current route highlighted.
- Incoming invites show a numeric badge on «Заявки».
- Feed, list, and requests empty/loading states are readable and consistent.
- Search for a nickname and send an invite remains available from the Друзья tab.
- Scrolling friends/profile moves the page header and top app nav with content.

## Notes

- Routes stay `/friends/feed`, `/friends/list`, `/friends/requests`.
- Other-user profile `/users/[userRef]` friends tab is out of scope.
- Feed unread badge in More menu is out of scope.
