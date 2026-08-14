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
9. [x] Tapping a Lampa continue card opens the movie/series detail (site parity) so Home does not wait on WatchHub. Detail «Продолжить» starts playback.
10. [x] Ignore unfinished progress superseded by a later finished watch on another device (phone/web).
11. [x] On TV, refetch progress, library, and history when returning from the player (`/watch`) or when the app becomes active — not on every Home focus (detail Back must not start a query storm). Phone keeps pull-to-refresh.
12. [x] TV continue-watching source queries use `staleTime` ~45s and `refetchOnMount: false`; keep last good data in memory when a refetch fails. Invalidate after watch / app resume still refreshes the rail.
13. [x] Back from that detail (or from the player) returns to Home, not the movies/series hub tab.
14. [x] Persist title/poster locally when playback starts (`watchHistoryMeta`) so progress-only rows still show artwork.
15. [x] Enrich missing Lampa posters from title detail; do not stringify poster objects (`[object Object]`).
16. [x] Continue cards use the same display pipeline as catalog `PosterCard` (`usePosterDisplayUri`): yani host rewrite, Anilib hotlink prefetch, dead-poster refresh when `animeId` is known.

## Acceptance Criteria

- After watching part of a movie or series, it appears in «Продолжить просмотр» on Home without requiring a manual library status.
- Continue cards show real posters for anime and Lampa titles (not a letter fallback) once library, history, local watch cache, or detail enrich has a path.
- Continue-card artwork loads through the same rewrite + hotlink prefetch path as anime catalog posters (TV Glide does not wait on `onError`).
- Anime continue cards still deep-link to the unfinished episode when possible.
- Completed titles do not stay in the rail.
- Tapping a Lampa continue card opens `/movies/:id` or `/series/:id` immediately; Home does not poll WatchHub on the card.
- If the previous source/dub is unavailable from the detail source sheet, the user can choose again.
- Back from a continue-watching series/movie opened from Home returns to Home.
- After watching further episodes on phone/web, returning to TV Home shows the current resume point (not a stale earlier unfinished episode).
- Leaving the player (Back / Home / app switch) persists the latest position without waiting for the next interval tick.
- A failed continue-watching refetch does not clear the rail; the previous successful list remains until a successful fetch.
- Progress labels must not invent a 24‑minute runtime (`progress * 1440`).

## Notes

- Detail routes require a numeric TMDB/lampa id (`/movies/:id`, `/series/:id`). UUID-only progress rows need library, history, or local watch-history meta for the href.
- Selection storage mirrors iOS `LastSelection` (`sourceId`, `seasonNumber`, `dubId`) on the detail source sheet, not on the Home card.
- Progress source of truth is the API; local storage holds failed PUT retries, Lampa lastSelection, and continue-watching title/poster meta.
- TV Home invalidates continue sources after `/watch` (`markWatchSessionOpen` / `consumeWatchSession`) and on AppState resume, not on every Home focus.
- Poster display lives in `usePosterDisplayUri` (shared with `PosterCard`).
