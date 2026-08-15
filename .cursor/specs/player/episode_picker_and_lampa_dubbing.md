# Player Episode Picker + Lampa In-Player Dubbing

## Description

TV player episode overlay groups episodes by season with a «Сейчас» marker. Phone player uses a numbered tile grid (site `PlayerEpisodePicker`). Lampa watch exposes in-player озвучка (translator) switching when multiple translators exist, preserving playback position.

## Requirements

### Episode picker

1. [x] Episodes overlay shows season sections («Сезон N») when more than one season exists.
2. [x] Current episode is labeled «Сейчас».
3. [x] Selecting an episode switches playback via existing episode nav.
4. [x] Anime: group by season when episode data provides season numbers; otherwise one section.
5. [x] Lampa: build sections from `payload.seasons` (not a flat unlabeled list).
6. [x] D-pad focus moves within the overlay list/sections without stealing the focus sink incorrectly. While the overlay is open, `TvPlayerFocusSink` uses `overlayTrap`: ping-pong ↑/↓ pads step software focus on every landing so Android 2D-search cannot swallow the key (bounce-to-sink required a second press).
7. [x] Netflix-style right-rail panel with episode cards (thumbnail, title, duration, progress).
8. [x] Phone episode sheet is a numbered tile grid (site `PlayerEpisodePicker`): season headers, «Сейчас» on the current tile, caption of the current episode.

### Lampa dubbing

7. [x] When WatchHub returns more than one translator, player shows «Озвучка» option.
8. [x] Switching translator re-fetches links, replaces stream, and keeps current time when possible.
9. [x] Last translator choice persists via `lampaLastSelection`.
10. [x] Anime player dubbing change also persists `animeLastDubbing_{animeId}`.

## Acceptance Criteria

- Serial with multiple seasons shows season headers in the episodes overlay.
- TV: ↑/↓ in the episodes overlay moves the highlight between cards (including across season headers); the sink does not keep D-pad in 2D-search.
- Phone player episode sheet shows a 5-column number grid, not a flat label list.
- Switching Lampa озвучка mid-watch continues near the same timestamp.
- Anime with one dubbing / Lampa with one translator does not show the dubbing menu.

## Notes

- Source: site `PlayerEpisodePicker`, `WatchPage` `switchLampaTranslator`.
- TV overlays live in `TvPlayerOverlays` / `useTvPlayerRemote`. Overlay lists stay software-focused (`focusable={false}`); `overlayTrap` on `TvPlayerFocusSink` is required because Android TV consumes DPAD_UP/DOWN as focus search and never delivers them to JS.
- Phone grid picker lives in `PhoneEpisodePicker`; season grouping is shared via `buildEpisodeSections`.
