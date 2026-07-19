# Detail Screens (Anime + Lampa)

Native TV detail screens parity with web desktop/TV layout (`site/`).

## Description

Port Anime and Lampa (movies/series) detail screens into `aniverse-tv` with hero + main/sidebar composition, play/continue, library status + favorite, add-to-collection, episodes/seasons, characters, franchise/cast rails, and related rails. Exclude reactions and download CTAs on detail.

## Requirements

### Shared

- [x] TV/wide layout uses two-column main + ~280px sidebar; phone uses stacked scroll
- [x] Focusable controls use `TvFocusable` / Pressable focus rings
- [x] Loading skeleton and error state for both detail types
- [x] Phone density: hero min-height ≤ 240px, title ≤ 22px; related posters use `layout.posterWidthDetail` (≤ 100px)
- [x] Phone density: episode stills/cards, cast tiles, and section gaps stay compact (tighter than desktop/TV)
- [x] Hero without poster/backdrop keeps a fixed min-height (no `flex: 1` ImageBackground) so episodes stay under the hero
- [x] Anime episode captions use `N Эпизод` (not `Эп. N · Episode N`)
- [x] TV anime detail is a single non-flex-growing column; no nested episode ScrollView overlaying «Похожее»

### Anime (`/anime/[id]`)

- [x] Backdrop hero with title, meta pills, Play/Continue with episode hint
- [x] Status picker + favorite toggle + «В коллекцию» picker (no download)
- [x] Plot section with expandable description
- [x] Episodes list with progress + load more
- [x] Sidebar meta (status, year, studio, age, rating, episode count)
- [x] Related rails: Похожие + Рекомендации
- [x] Characters horizontal rail (name, image, role)
- [x] Dubbing/quality selection still feeds watch navigation
- [x] TV: stacked full-width layout (not cramped 2-column); larger hero/plot/meta type
- [x] TV: Play stays focusable (not `disabled` while loading); preferred focus + Left/Up → sidebar
- [x] TV: episodes are a vertical nested list with D-pad focus; first episode is `railStart`
- [x] TV: library status modal prefers focus on the first option

### Lampa (`/movies/[id]`, `/series/[id]`)

- [x] Backdrop hero with title, meta pills, Play/Continue opening source sheet (card density matches AnimeDetailHero)
- [x] Status picker + favorite toggle + «В коллекцию»; serials can open sources (no download/reactions)
- [x] Plot / overview section
- [x] Serials: seasons + episode list; selecting episode opens sheet with S/E
- [x] Sidebar info rows (type, premiere, runtime, status, seasons, genres)
- [x] Similar + Recommendations rails via WatchHub TMDB
- [x] Movies: franchise «Связанные» rail via TMDB collection
- [x] Cast rail via TMDB credits
- [x] Progress/resume via `buildLampaPlaybackState`

## Acceptance Criteria

1. Anime continue plays the correct resume episode with progress when available.
2. Anime status and favorite persist after leaving and reopening the screen.
3. Anime related posters navigate to other anime detail screens.
4. Movie continue opens source sheet and can play via WatchHub.
5. Series seasons are visible; episode selection opens the source sheet prefilled.
6. Lampa status/favorite and similar/recommendations work on D-pad.
7. Phone layout remains usable in stacked order with compact cards (more content above the fold than the previous large hero/episode cards).
8. On TV anime detail, D-pad reaches Play, library chips, plot expand, episode rows, and load-more; Left from Play/first episode reaches the app sidebar.
9. Authenticated users can open «В коллекцию», pick an existing collection or create one, and the title appears in that collection.

## Notes

- Source of truth: `site` desktop branches of `AnimeDetailPage` / `LampaDetailPage`.
- Visual language parity with existing `colors` / `GlassSurface` tokens, not pixel-perfect CSS copy.
