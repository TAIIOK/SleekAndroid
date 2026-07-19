# Continue Watching

Home «Продолжить просмотр» shows unfinished anime, movies, and series so the user can resume playback.

## Requirements

1. [x] Build the rail from watch progress (not only library «Смотрю» entries).
2. [x] Include movies and series with in-progress Lampa progress (`0.01 < progress < 0.98`).
3. [x] Enrich title, poster, kind, and detail href from saved library and activity history when available.
4. [x] Skip completed titles and items without a resolvable numeric detail route.
5. [x] Keep library `watching` entries that have no progress yet.
6. [x] Cap visible items (16 in builder; TV hook may slice further).
7. [x] Persist last Lampa source + dub (+ season) when the user plays from the source sheet (`lastSelection_{mediaId}`, iOS parity).
8. [x] Source sheet restores the last source/dub/season when opened.
9. [x] Tapping a Lampa continue card tries to restore the last selection and open the player immediately; on failure falls back to the detail screen.

## Acceptance Criteria

- After watching part of a movie or series, it appears in «Продолжить просмотр» on Home without requiring a manual library status.
- Anime continue cards still deep-link to the unfinished episode when possible.
- Completed titles do not stay in the rail.
- After the user has chosen a source/dub once, tapping continue watching for that title attempts to load the same source/dub and start playback without re-picking.
- If the previous source/dub is unavailable, the app opens the detail screen so the user can choose again.

## Notes

- Detail routes require a numeric TMDB/lampa id (`/movies/:id`, `/series/:id`). UUID-only progress rows need library or history enrichment for the href.
- Selection storage mirrors iOS `LastSelection` (`sourceId`, `seasonNumber`, `dubId`).
