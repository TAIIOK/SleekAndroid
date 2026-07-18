# TV Density

## Description

TV catalog and shell UI must stay readable at a distance while remaining dense enough for comfortable D-pad navigation: more posters per rail, shorter focus travel, and less wasted gutter/sidebar space.

## Requirements

1. [x] TV rail poster width is at most 148px (token: `layout.posterWidthRail`).
2. [x] TV continue-watching card width is at most 232px (token: `layout.continueCardWidth`).
3. [x] TV side navigation width is at most 228px (token: `layout.tvSideNavWidth`).
4. [x] TV content gutter is at most 32px (token: `layout.gutterDesktop` on TV).
5. [x] TV rail/section titles use at most 22px font size (`typography.railTitle` / home titles).
6. [x] Home screen does not double-apply horizontal gutter padding on top of rail/section gutters.
7. [x] TV focus uses a high-contrast ring; modest scale is allowed when it improves focus readability.
8. [x] TV nav rows stay compact (min height ≤ 44px, label ≤ 14px).

## Acceptance Criteria

- On a typical 1080p TV layout, a home rail shows visibly more posters without horizontal scrolling than the previous 184px cards.
- Side navigation leaves more width for catalog content.
- Focus travel between adjacent posters feels shorter; titles remain legible.

## Notes

- Density tokens live in `src/constants/aniverse.ts`; shell metrics in `AppShell.tsx`.
- Phone sizes are unchanged.
