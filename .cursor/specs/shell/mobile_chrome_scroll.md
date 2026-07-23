# Mobile Chrome Scroll & Tab Transparency

## Description

On phone UI, the floating top nav island should slide away with vertical content scroll (as if part of the scroll view). The bottom tab capsule should use a more transparent glass background so content shows through.

## Requirements

- [x] Top mobile island translates upward in sync with vertical `contentOffset.y`, clamped to its full height (including safe-area padding)
- [x] Top island returns when scrolling back toward the top
- [x] Chrome scroll tracking is a shared provider; main phone `ScrollView`s report offset via a small hook
- [x] Shell does not reserve solid top/bottom gutters for overlay chrome; content pads inside scroll views and scrolls under islands
- [x] Bottom tab island uses a translucent background over scrolling content
- [x] Web CSS for `.mobile-bottom-island` matches the native translucency
- [x] Detail / watch routes that already hide chrome are unchanged
- [x] TV UI is unchanged

## Acceptance Criteria

- Scrolling down on Home / catalog hubs moves the top island off-screen with the content
- Scrolling back to `y ≈ 0` fully restores the top island
- Bottom tabs remain visible with visible content behind a frosted/transparent capsule
- Opening a detail screen still hides both chrome bars as before
