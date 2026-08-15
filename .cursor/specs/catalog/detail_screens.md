# Detail Screens (Anime + Lampa)

Native TV detail screens parity with web desktop/TV layout (`site/`).

## Description

Port Anime and Lampa (movies/series) detail screens into `aniverse-tv` with hero + main/sidebar composition, play/continue, library status + favorite, add-to-collection, episodes/seasons, characters, franchise/cast rails, and related rails. Exclude reactions and download CTAs on detail.

## Requirements

### Shared

- [x] Detail content is a stacked column; related/similar rails are full-width below plot/cast (see `detail_related_similar.md`)
- [x] Focusable controls use `TvFocusable` / Pressable focus rings
- [x] Loading skeleton and error state for both detail types
- [x] Phone density matches Lampa movies/series detail (hero title 22px, aside/meta 11/14, section titles 16px)
- [x] Phone density: episode stills/cards, cast tiles, and section gaps match Lampa detail
- [x] Hero without poster/backdrop keeps a fixed min-height (no `flex: 1` ImageBackground) so episodes stay under the hero
- [x] Anime episode captions use `N Эпизод` (not `Эп. N · Episode N`)
- [x] TV anime detail is a single non-flex-growing column; no nested episode ScrollView overlaying «Похожее»

### Anime (`/anime/[id]`)

- [x] Backdrop hero with title, meta pills, Play/Continue with episode hint
- [x] Hero image order matches site: `backdrop` → typed `background|banner|fanart|landscape` → poster variants → screenshots
- [x] Hero loads via `expo-image` with candidate fallback on error and Anilib hotlink Referer when needed
- [x] Catalog `PosterCard` keeps portrait `type=poster`; same display pipeline as continue watching (yani rewrite + Anilib hotlink prefetch, not wait on `onError`)
- [x] Next-episode date + live countdown when `nextEpisodeDate` is in the future (see `anime_detail_next_episode.md`)
- [x] Status picker + favorite toggle + «В коллекцию» picker (no download)
- [x] Plot section with expandable description
- [x] Episodes list with progress + load more
- [x] Sidebar meta (status, year, studio, age, rating, episode count)
- [x] Hero surfaces key meta; avoid duplicate meta-only sidebar when hero already shows it (see `detail_desktop_hero.md`)
- [x] Episodes section voiceover selector when multiple dubbings (see `anime_detail_dubbing_selector.md`)
- [x] Related rails: Связанные + Рекомендации + Похожее (see `detail_related_similar.md`)
- [x] Characters horizontal rail (name, image, role)
- [x] Dubbing/quality selection still feeds watch navigation
- [x] TV: stacked full-width layout (not cramped 2-column); larger hero/plot/meta type
- [x] TV: Play stays focusable (not `disabled` while loading); preferred focus + Left/Up → sidebar
- [x] TV: episodes are a vertical nested list with D-pad focus; first episode is `railStart`
- [x] TV: library status modal prefers focus on the first option

### Lampa (`/movies/[id]`, `/series/[id]`)

- [x] Backdrop hero with title, external rating pills (IMDb / КП / RT) under the title, meta pills, Play/Continue opening source sheet (card density matches AnimeDetailHero)
- [x] Status picker + favorite toggle + «В коллекцию»; serials can open sources (no download/reactions)
- [x] Plot / overview section
- [x] Serials: seasons + episode list; selecting episode opens sheet with S/E
- [x] TV: opening source / озвучка / season picker focuses the first result chip/row (not the back button)
- [x] Source sheet ✕ / hardware back dismisses immediately, including while WatchHub is still searching sources
- [x] Sidebar info rows (type, premiere, runtime, status, seasons, genres)
- [x] Hero surfaces key info rows (see `detail_desktop_hero.md`)
- [x] Related rails: Связанные + Рекомендации + Похожее via WatchHub TMDB (see `detail_related_similar.md`)
- [x] Franchise «Связанные» rail via TMDB collection for movies and series when present
- [x] Cast rail via TMDB credits
- [x] Progress/resume via `buildLampaPlaybackState`

## Acceptance Criteria

1. Anime continue plays the correct resume episode with progress when available.
2. Anime status and favorite persist after leaving and reopening the screen.
3. Anime related posters navigate to other anime detail screens.
4. Movie continue opens source sheet and can play via WatchHub.
5. Series seasons are visible; episode selection opens the source sheet prefilled.
6. Source sheet can be closed while sources are still loading.
7. Lampa status/favorite and similar/recommendations work on D-pad.
8. Phone layout remains usable in stacked order with the same type scale as movies/series detail.
9. On TV anime detail, D-pad reaches Play, library chips, plot expand, episode rows, and load-more; Left from Play/first episode reaches the app sidebar.
10. Authenticated users can open «В коллекцию», pick an existing collection or create one, and the title appears in that collection.

## Notes

- Source of truth: `site` desktop branches of `AnimeDetailPage` / `LampaDetailPage`.
- Anime hero/poster URL picking lives in `src/lib/poster.ts` (`collectBackdropImageCandidates`) and `animeHeroImageCandidates`; catalog rails still use `extractPosterPath` (`type=poster`).
- Visual language parity with existing `colors` / `GlassSurface` tokens, not pixel-perfect CSS copy.
