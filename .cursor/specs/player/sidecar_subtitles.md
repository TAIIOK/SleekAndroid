# Sidecar Subtitles (Lampa / WatchHub)

## Description

WatchHub returns external (sidecar) WebVTT tracks as `links[].subtitles: [{ label, url }]`. The TV Lampa player must attach these as `react-native-video` `source.textTracks` and expose them in the existing CC UI. Contract: [site/docs/sidecar_subtitles.md](../../../site/docs/sidecar_subtitles.md).

This is **not** in-manifest HLS `EXT-X-MEDIA:TYPE=SUBTITLES` and **not** transcoding `/transcoding/.../subtitles`.

## Requirements

1. [x] `WatchHubVideoLink` includes optional `subtitles?: { label: string; url: string }[]`
2. [x] Normalize sidecar payloads via `pickLampaSidecarSubtitles(links, activeLink)` (active quality first, else `links[0]`)
3. [x] Use `subtitles[].url` as-is (proxy or direct); do not rebuild paths
4. [x] Pass tracks into `VideoPlayer` as `subtitles` (separate from chrome `subtitle` line)
5. [x] Engine maps sidecar to `source.textTracks` with `TextTrackType.VTT`
6. [x] Merge sidecar + in-stream text tracks in the CC menu; hide menu when empty
7. [x] Default: subtitles off unless `preferredSubtitleLanguage` matches a track (by language or label)
8. [x] Persist selection via `preferredSubtitleLanguage = language || label` so quality switches rematch by label
9. [x] Off selection uses `SelectedTrackType.DISABLED`
10. [x] Empty / missing `subtitles` does not break playback; VTT load failure must not stop video

## Acceptance Criteria

- With WatchHub `links[].subtitles`, movie/series player shows CC menu with 0 / 1 / N tracks
- Changing quality keeps the same subtitle when the `label` still exists
- Proxy VTT URLs play with HLS without extra CDN auth
- Empty `subtitles` leaves player behavior unchanged (no CC UI)

## Notes

- Anime catalog playback is out of scope
- Custom subtitle appearance overlay (web) is out of scope; ExoPlayer renders cues
