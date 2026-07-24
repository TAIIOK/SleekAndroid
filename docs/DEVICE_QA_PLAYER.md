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

Mark both items `[x]` in `.cursor/specs/player/video_player.md` QA section after passing on device.
