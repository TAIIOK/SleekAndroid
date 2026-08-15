# TV Focus Navigation

## Description

Remote/D-pad focus on Android TV must be unmistakable on catalog cards and must allow reliable movement between the content area and the left side menu. The side menu is a full-bleed overlay (hidden while browsing content).

## Requirements

1. [x] Focused poster/continue cards show a brand lavender ring (`tvFocus`) and clear selected state (wash + title tint).
2. [x] Unfocused cards do not use the same border/glow treatment as focused cards.
3. [x] Sidebar nav items show a distinct focused state separate from the active route highlight (active = soft tint; focused = ring/glow; active+focused = white ring).
4. [x] From the first item in a horizontal rail (and continue-watching entry), pressing Left opens the side menu overlay and moves focus into it.
5. [x] Top content entry also maps Up to open the side menu for an alternate menu path.
6. [x] Profile chip in the sidebar is focusable with a visible focused state.
7. [x] Metro resolves `react-native` to monorepo `react-native-tvos` so `TVFocusGuideView` / `useTVEventHandler` are available.
8. [x] When D-pad focus moves vertically between rails, Android TV scrolls the focused descendant into view. Do **not** use `snapToAlignment="item"` — Fabric only accepts `start|center|end` and aborts the JS thread otherwise (app closes after login).
9. [x] Scrolling a horizontal rail right (focus paging / hold-Right) keeps focus on the active card; focus must not jump to adjacent rails (see `tv_catalog_focus_and_scroll.md`). Continue Watching traps Right in a focus guide, pins sibling Left/Right, and steals focus back if a horizontal key escaped the rail. Catalog rails on Home / Anime / Movies / Series set `nextFocusUp` / `nextFocusDown` to the previous/next rail (or page title).
10. [x] While focus is in content, the side menu is hidden and does not reserve layout width (content is full-bleed).
11. [x] Right from the side menu (or leaving sidebar focus) returns focus to content and closes the overlay.
12. [x] Route change parks sidebar only on top-level nav change, not detail push; detail push must not flash the overlay (see `tv_catalog_focus_and_scroll.md`).
13. [x] Back from detail restores catalog scroll + focused poster (see `tv_catalog_focus_and_scroll.md`).
14. [x] Double Left (or Left on the first Home type-filter plus HW backup) must not leave the overlay open with focus in content. Home `rowExit` stays focusable until a sidebar row owns focus.
15. [x] Content gaining focus while the overlay is visible closes the menu immediately.
16. [x] Back while the overlay is open closes it and returns focus to the last content anchor.

## Acceptance Criteria

- A user can tell at a glance which card currently has focus.
- From home content, Left on the leftmost card opens the menu overlay and focuses the active nav item without scrolling to the top first. Left on the first Home type-filter does not drop into the row below.
- From the sidebar, Right returns focus into the content area and hides the menu.
- Double Left does not leave a stuck overlay: focus stays in the sidebar, or the overlay closes if focus returns to content.
- Back dismisses the open overlay and restores content focus.
- Catalog content uses the full screen width while the menu is closed.
- Moving Up/Down across rails keeps the focused rail’s title on screen.
- Holding Right across a long rail keeps a visible focus ring on posters in that rail.
- Rapid Right in Home Continue Watching stays on continue cards, not type filters.
- On Anime / Movies / Series, Up from the first rail reaches the page title; Down from a rail reaches the next mounted rail.

## Notes

- Horizontal `ScrollView` on Android TV often swallows `nextFocusLeft`. Exit-to-sidebar uses `useTVEventHandler` + `requestTVFocus()` on the sidebar anchor when a rail-start / top-entry card is focused; `TvShellFocus` also sets `menuOpen`. A second Left while the overlay is already open only retries `requestTVFocus` (no second open-cycle). Content `TvFocusGuide` turns `autoFocus` off while `menuOpen` so it cannot steal the handoff.
- Closed menu stays mounted on-screen at `opacity: 0` (no `translateX` — off-screen anchors reject focus on Android TV). Only the active nav anchor stays `focusable` until the overlay opens; `nextFocusRight` pins return to the content anchor.
- Handle `eventKeyAction === 1` (key up): rn-tvos Android defaults to key-up-only HW events. Native Left on a rail-start may 2D-search Down before key-up; the arm stays live for a short grace so that key-up still opens the menu.
- Arm Left/Up→sidebar only after ~220ms on a rail-edge card so one Left from the 2nd card does not also jump to the sidebar on key-up.
- Horizontal rails use `scrollAnimationEnabled: false` (no `snapToInterval`); animated paging + mismatched snap stride cleared focus. `useTvRailFocusRestore` re-requests focus after item count changes while the rail owns focus.
- Short chip rows (filters/stats/hub tabs) must be a plain `View` row — a horizontal `ScrollView` on TV often skips every other focusable on Left/Right.
- Sidebar profile chip lives **inside** the nav `ScrollView` (flexGrow spacer keeps it at the bottom). A sibling footer is unreachable because a vertical `ScrollView` swallows Down. Last hub row pins `nextFocusDown` to the chip; the chip pins `nextFocusUp` back.
- Only true left-edge rail/hub entries set `railStart`. Nested filter/stat chips must not — Left would jump to the sidebar and feel like a multi-item skip.
- Rail-edge controls set `nextFocusLeft` to the sidebar native tag so Android does not 2D-search across the page on Left; HW handler remains a ScrollView backup.
- Exit Left/Up flags reset on route change so a stuck arm cannot send every Left to the sidebar; route change also closes the menu.
- Vertical catalog scroll helpers live in `src/lib/tvCatalogScroll.ts`.
- App shell: content is full-bleed; side menu is an absolute overlay (`TvFocusGuide`) above content.
- Phone layouts are unchanged.
