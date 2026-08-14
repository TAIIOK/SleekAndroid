# Mobile Chrome Scroll & Tab Transparency

## Description

On phone UI, the floating top nav island should slide away with vertical content scroll (as if part of the scroll view). The bottom tab capsule should use a more transparent glass background so content shows through.

## Requirements

- [x] Top mobile island translates upward in sync with vertical `contentOffset.y`, clamped to its full height (including safe-area padding)
- [x] Top island returns when scrolling back toward the top
- [x] Chrome scroll tracking is a shared provider; main phone `ScrollView`s report offset via a small hook
- [x] Shell does not reserve solid top/bottom gutters for overlay chrome; content pads inside scroll views and scrolls under islands
- [x] Top/bottom chrome wrappers have no solid fill, scrim, or hairline bar — only the glass islands paint
- [x] Bottom tab island uses a darkened translucent glass fill (`rgba(19,18,27,0.72)` + blur) so tab labels stay readable
- [x] Web CSS for `.mobile-bottom-island` matches the native darkened translucency
- [x] Detail / watch routes that already hide chrome are unchanged
- [x] TV UI is unchanged
- [x] On `/library/*`: overlay chrome; top island scrolls away with content (same as home/catalog)
- [x] On `/party`: classic shell layout (`nav` + scrollable `body` + `footer`) in document flow
- [x] On `/friends/*` and `/users/*`: overlay top nav scrolls away with content (same as home/catalog)

## Acceptance Criteria

- Scrolling down on Home / catalog hubs moves the top island off-screen with the content
- Scrolling back to `y ≈ 0` fully restores the top island
- Bottom tabs remain visible in a darkened glass capsule; no full-width bar or gradient scrim behind them
- Opening a detail screen still hides both chrome bars as before
- Library / friends / user profile scroll the top nav away over content (no solid chrome gutters); party lobby keeps in-flow nav/footer
