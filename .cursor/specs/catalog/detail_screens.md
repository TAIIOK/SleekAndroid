# Detail Screens (Anime + Lampa)

Native TV detail screens parity with web desktop/TV layout (`site/`).

## Description

Port Anime and Lampa (movies/series) detail screens into `aniverse-tv` with hero + main/sidebar composition, play/continue, library status + favorite, episodes/seasons, and related rails. Exclude collections picker, reactions, download CTAs on detail, and characters.

## Requirements

### Shared

- [x] TV/wide layout uses two-column main + ~280px sidebar; phone uses stacked scroll
- [x] Focusable controls use `TvFocusable` / Pressable focus rings
- [x] Loading skeleton and error state for both detail types

### Anime (`/anime/[id]`)

- [x] Backdrop hero with title, meta pills, Play/Continue with episode hint
- [x] Status picker + favorite toggle (no download/collections)
- [x] Plot section with expandable description
- [x] Episodes list with progress + load more
- [x] Sidebar meta (status, year, studio, age, rating, episode count)
- [x] Related rails: Похожие + Рекомендации
- [x] Dubbing/quality selection still feeds watch navigation

### Lampa (`/movies/[id]`, `/series/[id]`)

- [x] Backdrop hero with title, meta pills, Play/Continue opening source sheet
- [x] Status picker + favorite toggle; serials can open sources (no download/collections/reactions)
- [x] Plot / overview section
- [x] Serials: seasons + episode list; selecting episode opens sheet with S/E
- [x] Sidebar info rows (type, premiere, runtime, status, seasons, genres)
- [x] Similar + Recommendations rails via WatchHub TMDB
- [x] Progress/resume via `buildLampaPlaybackState`

## Acceptance Criteria

1. Anime continue plays the correct resume episode with progress when available.
2. Anime status and favorite persist after leaving and reopening the screen.
3. Anime related posters navigate to other anime detail screens.
4. Movie continue opens source sheet and can play via WatchHub.
5. Series seasons are visible; episode selection opens the source sheet prefilled.
6. Lampa status/favorite and similar/recommendations work on D-pad.
7. Phone layout remains usable in stacked order.

## Notes

- Source of truth: `site` desktop branches of `AnimeDetailPage` / `LampaDetailPage`.
- Visual language parity with existing `colors` / `GlassSurface` tokens, not pixel-perfect CSS copy.
