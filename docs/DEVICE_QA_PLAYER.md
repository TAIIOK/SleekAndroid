# Player device QA checklist

Run on **Sleek TV** APK (`EXPO_TV=1`) — emulator `Television_1080p` and/or a real Android TV / Fire TV stick.

## Code paths (verified in repo)

- External player launch passes `positionSeconds` → ms extras for Just Player / VLC / mpv: `src/lib/externalPlayer.ts`
- Phone + TV HUDs call `launchExternalPlayer({ positionSeconds: engine.currentTime })`
- In-app HLS uses `react-native-video` / ExoPlayer (`useRNVideoEngine`)

## Hardware smoke

### Long HLS / 4K

1. Open a long anime or Lampa HLS source (prefer 1080p+).
2. Play for **≥ 5 minutes** without stutter lockup; seek mid-stream.
3. If 4K is available and ExoPlayer stutters, confirm «Внешний плеер» still works.

### External player resume

1. Watch in-app to ~2–5 minutes; note position.
2. Open «Внешний плеер» → Just Player or VLC.
3. Confirm the external app starts near the same position (package extras `position` in ms).

### Episode switch binge (heap / lag regression)

1. Play an anime or Lampa serial; advance **3–5 episodes** via next or auto-next.
2. Confirm playback stays smooth after each switch (no sustained UI/decode lag).
3. Exit watch, open a **different** title without killing the app; confirm playback is still smooth.
4. Mark acceptance in `.cursor/specs/player/episode_switch_perf.md` after passing on device.

### Perf HUD (opt-in)

Off by default in all builds (including `__DEV__`). Enable with `EXPO_PUBLIC_PLAYER_PERF=1`:

- **JS fps / ms** — JS thread via `requestAnimationFrame` (green ≥50, yellow ≥30, red below)
- **UI n/s · Σ** — React re-renders of the player host per second (green ≤2, yellow ≤6, red above)
- **buf / play / t / nav / src** — buffering, play state, position, episode-nav size, truncated URL

Compare **before next episode** vs **after 3–5 switches**: JS fps should stay high; UI/s should stay low while idle (not climbing every ~5s).

Mark long-HLS / external items `[x]` in `.cursor/specs/player/video_player.md` QA section after passing on device.
