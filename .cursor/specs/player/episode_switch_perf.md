# Episode Switch Performance

Keep binge / auto-next transitions light on Android TV heap and JS memory so playback stays smooth after the next episode without requiring an app reload.

## Description

After next / auto-next, ExoPlayer buffers and process-global caches can accumulate pressure that survives switching titles. Episode transitions must tear down the previous native player before loading the next source, avoid React Query invalidation during media load, and not multiply identical episode-list cache entries per episode id.

## Requirements

1. [x] Before anime or Lampa episode navigation (manual next/prev/select or auto-next), the in-app player pauses and clears `src` so `<Video>` unmounts before the next URL is applied.
2. [x] Lampa does not keep decoding the previous episode while `fetchVideoLinks` runs; video stays unloaded until new links are set.
3. [x] `bufferConfig` is a stable module-level (or memoized) object, not a new object every render.
4. [x] Progress `flush` on episode switch patches cache and PUTs without `invalidateQueries`; invalidation runs on leave-watch / unmount only.
5. [x] Anime watch episodes query uses `queryKey: ['watch-episodes', animeId]` (not per-`episodeId`) so binge does not duplicate the same page-1 list in React Query.
6. [x] WatchHub `taskResponseCache` is bounded (trim oldest entries).
7. [x] Engine buffer-spinner timer clears on unmount; phone gesture hint timers clear on unmount.
8. [x] Anime / Lampa watch screens memoize `episodeNav`, menu option arrays, and progress/auto-next callbacks to limit player-tree re-renders.
9. [x] Mid-watch progress PUT does not call `patch*ProgressCache` (no RQ subscriber churn → no rebuild of up to 500 nav items every ~5s); cache patch remains on flush / leave-watch.

## Acceptance Criteria

1. Next episode / auto-next: previous ExoPlayer instance is unmounted (empty `src`) before the next source mounts.
2. Mid-binge progress flush does not call `invalidateQueries` for anime/lampa progress.
3. Leaving the watch screen still flushes pending progress and invalidates progress queries so continue-watching refreshes.
4. Opening episode N then N+1 of the same anime shares one `['watch-episodes', animeId]` cache entry.
5. After several episode switches in one process, opening a different title does not require an app reload for smooth playback (device smoke on Android TV).

## Notes

- Related: [`video_player.md`](video_player.md), [`episode_progress_resume.md`](../playback/episode_progress_resume.md).
- Root cause analysis: double decoder peak + unscoped RQ keys + invalidate-on-flush during load.
