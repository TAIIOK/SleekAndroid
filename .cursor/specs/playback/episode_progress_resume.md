# Episode Progress Resume

Resume and continue-watching must attribute progress to the episode the user actually watched, not a library “next episode” hint or a stale player tick after auto-next.

## Requirements

1. [x] Detail resume state (anime + Lampa) derives season/episode and progress from the same unfinished progress row (`0.01 < progress < 0.98`), ignoring unfinished rows superseded by a later finished watch (`updatedAt`).
2. [x] Library `lastEpisode` / `lastWatchingEpisode` is used only as a fallback when no current unfinished progress rows exist.
3. [x] Resume UI never pairs one episode’s number with `max(progress)` from another episode.
4. [x] Continue Watching includes only current unfinished rows (`0.01 < progress < 0.98`, not `completed`, not superseded by newer finished activity).
5. [x] Anime episode switches flush pending progress for the current episode before navigating.
6. [x] After an episode identity change, throttled progress sync ignores stale near-end ticks until a fresh (non-completed) playback tick arrives.
7. [x] Progress retry queue drops queued PUTs when the server already has newer activity for the same title (`updatedAt > enqueuedAt`).

## Acceptance Criteria

- After watching episode 2 to ~40% (and not watching episode 3), detail hero shows episode 2 with ~40%, not episode 3.
- Continue Watching deep-links to episode 2 with the same progress.
- Finishing episode 2 with auto-next does not write completed/high progress for episode 3 until the user actually watches it.
- Episode list progress bars appear only on episodes with real progress rows.
- After leaving episode 3 unfinished on TV and completing later episodes on phone/web, TV resume/CW does not return to episode 3.

## Notes

- Write completion threshold remains `progress >= 0.9`; resume/CW unfinished upper bound is `0.98`.
- Phone/server may still advance library `lastEpisode` to N+1; the client must not trust that alone for the progress percentage.
- Cross-device: finished rows with newer `updatedAt` supersede older unfinished rows for the same title.
