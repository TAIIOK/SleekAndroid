# Anime Detail Dubbing Selector

## Description

Anime detail seasons/episodes block includes a voiceover (озвучка) selector. Choosing a voiceover filters the episode list to episodes that have that dubbing, and playback launches with the selected voiceover. The last watched voiceover for an anime is persisted client-side and restored as the selector default.

## Requirements

1. [x] Anime detail episode section shows a voiceover selector when more than one dubbing option is available.
2. [x] Dubbing options are derived from loaded episode `video[]` labels (`normalizeDubbingName`).
3. [x] Selecting a voiceover shows only episodes that have a playable stream for that voiceover.
4. [x] Play and resume navigate with `preferredDubbing` set to the selected voiceover.
5. [x] Last selected/watched voiceover is stored in AsyncStorage keyed by anime id.
6. [x] On detail open (and on focus return), the selector defaults to the stored voiceover when it is still available.
7. [x] The selector does not show a «Смотрели» marker; last watched voiceover is restored silently.
8. [x] Changing voiceover in the catalog watch player persists the new choice for that anime.
8b. [x] Watch screen restores stored voiceover on mount when `preferredDubbing` is absent (Continue Watching / bare re-entry).
9. [x] While more episode pages are loading and the filtered list is empty, the UI keeps loading instead of showing a permanent empty state.
10. [x] Sidebar dubbing block remains disabled; the selector lives in the episodes section only.
11. [x] Dubbing names in the closed trigger and option list wrap in full; they are not clipped by a tight max width or `numberOfLines`.
12. [x] The closed trigger shows only the selected dubbing name (no «Озвучка» prefix); the sheet title remains «Озвучка».

## Acceptance Criteria

- On an anime with multiple dubbings, the episodes block shows a selector.
- Switching the selector updates the visible episode list to that dubbing only.
- Tapping an episode opens the player on the selected voiceover.
- Returning to the detail page after watching/switching dubbing restores the last choice (when still available).
- Anime with a single dubbing does not show the selector.
- Long dubbing names are fully readable in the trigger and in the option list.

## Notes

- Catalog progress API does not store dubbing; persistence is client-only (`animeLastDubbing_{animeId}`).
- Related: `animePlaybackOptions`, `AnimeDetailEpisodes`, watch anime route.
