# TV Focus Navigation

## Description

Remote/D-pad focus on Android TV must be unmistakable on catalog cards and must allow reliable movement between the content area and the left sidebar menu.

## Requirements

1. [x] Focused poster/continue cards show a brand lavender ring (`tvFocus`) and clear selected state (wash + title tint).
2. [x] Unfocused cards do not use the same border/glow treatment as focused cards.
3. [x] Sidebar nav items show a distinct focused state separate from the active route highlight (active = soft tint; focused = ring/glow; active+focused = white ring).
4. [x] From the first item in a horizontal rail (and continue-watching entry), pressing Left moves focus into the sidebar.
5. [x] Top content entry also maps Up to the sidebar for an alternate menu path.
6. [x] Profile chip in the sidebar is focusable with a visible focused state.
7. [x] Metro resolves `react-native` to monorepo `react-native-tvos` so `TVFocusGuideView` / `useTVEventHandler` are available.
8. [x] When D-pad focus moves vertically between rails, the rail/section title stays visible (vertical `snapToAlignment="item"` + section `scrollSnapAlign="start"`).
9. [x] Scrolling a horizontal rail right (focus paging) keeps focus on the active card; focus must not disappear from that rail.

## Acceptance Criteria

- A user can tell at a glance which card currently has focus.
- From home content, Left on the leftmost card reaches the sidebar without scrolling to the top first.
- From the sidebar, Right returns focus into the content area.
- Moving Up/Down across rails keeps the focused rail’s title on screen.
- Holding Right across a long rail keeps a visible focus ring on posters in that rail.

## Notes

- Horizontal `ScrollView` on Android TV often swallows `nextFocusLeft`. Exit-to-sidebar uses `useTVEventHandler` + `requestTVFocus()` on the sidebar anchor when a rail-start / top-entry card is focused.
- Handle `eventKeyAction === 1` (key up): rn-tvos Android defaults to key-up-only HW events; ignoring action `1` breaks Left→sidebar.
- Arm Left/Up→sidebar only after ~180ms on a rail-edge card so one Left from the 2nd card does not also jump to the sidebar on key-up.
- Horizontal rails use `scrollAnimationEnabled: false` (no `snapToInterval`); animated paging + mismatched snap stride cleared focus. `useTvRailFocusRestore` re-requests focus after item count changes while the rail owns focus.
- Short chip rows (filters/stats/hub tabs) must be a plain `View` row — a horizontal `ScrollView` on TV often skips every other focusable on Left/Right.
- Only true left-edge rail/hub entries set `railStart`. Nested filter/stat chips must not — Left would jump to the sidebar and feel like a multi-item skip.
- Rail-edge controls set `nextFocusLeft` to the sidebar native tag so Android does not 2D-search across the page on Left; HW handler remains a ScrollView backup.
- Exit Left/Up flags reset on route change so a stuck arm cannot send every Left to the sidebar.
- Vertical catalog scroll helpers live in `src/lib/tvCatalogScroll.ts`.
- App shell wraps sidebar/content in `TvFocusGuide` (flush `TVFocusGuideView` when available).
- Phone layouts are unchanged.
