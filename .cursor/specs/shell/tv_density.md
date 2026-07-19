# TV Density

## Description

TV catalog and shell UI must stay readable at a distance while remaining dense enough for comfortable D-pad navigation: more posters per rail, shorter focus travel, and no wasted sidebar gutter (overlay menu).

## Requirements

1. [x] TV rail poster width is at most 120px (token: `layout.posterWidthRail`).
2. [x] TV continue-watching card width is at most 190px (token: `layout.continueCardWidth`).
3. [x] TV side navigation overlay width is at most 228px (token: `layout.tvSideNavWidth`); it does not reserve content layout width when closed.
4. [x] TV content gutter is at most 20px (token: `layout.gutterDesktop` on TV).
5. [x] TV rail/section titles use at most 18px font size (`typography.railTitle` / home titles).
6. [x] Home screen does not double-apply horizontal gutter padding on top of rail/section gutters.
7. [x] TV focus uses a high-contrast ring; modest scale is allowed when it improves focus readability.
8. [x] TV nav rows stay compact (min height ≤ 44px, label ≤ 14px).
9. [x] TV poster grid gap is ~10px (aligned with rails); grid columns use full window width minus gutters.
10. [x] TV Home type-filter / feed-tab chips stay compact (label ≤ 14px, tight vertical padding).

## Acceptance Criteria

- On a typical 1080p TV layout, a home rail shows more posters without horizontal scrolling than the previous 140px cards.
- Closed side menu leaves the full width for catalog content.
- Focus travel between adjacent posters feels shorter; titles remain legible.

## Notes

- Density tokens live in `src/constants/aniverse.ts`; shell metrics in `AppShell.tsx`.
- Phone sizes are unchanged.
