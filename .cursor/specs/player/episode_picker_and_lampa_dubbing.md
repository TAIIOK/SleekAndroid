# Player Episode Picker + Lampa In-Player Dubbing

## Description

TV player episode overlay groups episodes by season with a «Сейчас» marker. Lampa watch exposes in-player озвучка (translator) switching when multiple translators exist, preserving playback position.

## Requirements

### Episode picker

1. [x] Episodes overlay shows season sections («Сезон N») when more than one season exists.
2. [x] Current episode is labeled «Сейчас».
3. [x] Selecting an episode switches playback via existing episode nav.
4. [x] Anime: group by season when episode data provides season numbers; otherwise one section.
5. [x] Lampa: build sections from `payload.seasons` (not a flat unlabeled list).
6. [x] D-pad focus moves within the overlay list/sections without stealing the focus sink incorrectly.
7. [x] Netflix-style right-rail panel with episode cards (thumbnail, title, duration, progress).

### Lampa dubbing

7. [x] When WatchHub returns more than one translator, player shows «Озвучка» option.
8. [x] Switching translator re-fetches links, replaces stream, and keeps current time when possible.
9. [x] Last translator choice persists via `lampaLastSelection`.
10. [x] Anime player dubbing change also persists `animeLastDubbing_{animeId}`.

## Acceptance Criteria

- Serial with multiple seasons shows season headers in the episodes overlay.
- Switching Lampa озвучка mid-watch continues near the same timestamp.
- Anime with one dubbing / Lampa with one translator does not show the dubbing menu.

## Notes

- Source: site `PlayerEpisodePicker`, `WatchPage` `switchLampaTranslator`.
- TV overlays live in `TvPlayerOverlays` / `useTvPlayerRemote`.
