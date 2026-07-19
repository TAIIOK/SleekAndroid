# Continue Watching

Home «Продолжить просмотр» shows unfinished anime, movies, and series so the user can resume playback.

## Requirements

1. [x] Build the rail from watch progress (not only library «Смотрю» entries).
2. [x] Include movies and series with in-progress Lampa progress (`0.01 < progress < 0.98`).
3. [x] Enrich title, poster, kind, and detail href from saved library and activity history when available.
4. [x] Skip completed titles and items without a resolvable numeric detail route.
5. [x] Keep library `watching` entries that have no progress yet.
6. [x] Cap visible items (16 in builder; TV hook may slice further).

## Acceptance Criteria

- After watching part of a movie or series, it appears in «Продолжить просмотр» on Home without requiring a manual library status.
- Anime continue cards still deep-link to the unfinished episode when possible.
- Completed titles do not stay in the rail.

## Notes

- Detail routes require a numeric TMDB/lampa id (`/movies/:id`, `/series/:id`). UUID-only progress rows need library or history enrichment for the href.
