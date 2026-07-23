# Video Player (Anime + Lampa)

Native TV and phone player parity with web (`site/` TvVideoPlayer + desktop VideoPlayer + WatchPage).

## Description

Port the full watch experience into `aniverse-tv` on `react-native-video` (ExoPlayer / Media3 on Android TV, MIT): TV remote HUD with panel focus and overlays, phone custom HUD with gestures, anime dubbing/quality/episodes, Lampa quality/connection/delivery, progress throttle + resume, player prefs, OP/ED skip, auto-next, and Lampa-style open-in-external-app.

## Requirements

### Engine and prefs

- [x] `useRNVideoEngine` wraps `react-native-video` with play/pause, seek, rate, contentFit, loading/error/retry, startTime resume, skip segments, ended → auto-next
- [x] No commercial player license required (MIT)
- [x] Source typing: HLS (`.m3u8`) vs progressive; optional request headers when provided by WatchHub
- [x] High-bitrate / 4K-friendly ExoPlayer `bufferConfig` (avoid oversized forward buffers that thrash TV heap)
- [x] Long-session stability: no React Query invalidate on mid-watch progress PUT; debounce rebuffer spinner; quieter timeUpdate state updates
- [x] Player preferences persist in AsyncStorage (`aniverse-player-prefs`), including last external player package
- [x] Throttled anime and Lampa progress PUT with flush on unmount; sync only when real media duration is known (no 1440s / seekable-buffer fallback that inflates %)
- [x] `react-native-video` Expo plugin registered; THEOplayer / `expo-video` removed after cutover
- [x] `android:largeHeap` via config plugin for 4K heap headroom

### External player (Android)

- [x] Open current stream in Just Player, VLC, mpv, or system chooser (`ACTION_VIEW`)
- [x] Pass URL, title, and resume position (ms) with Lampa-compatible extras where possible
- [x] TV/phone UI: «Внешний плеер» overlay/sheet; pause in-app before launch; flush pending progress
- [x] Graceful message when no suitable app is installed

### TV UI and remote

- [x] Panel: timeline → center dock (prev/play/next) → options; auto-hide 3s while playing; hint ~2.5s
- [x] TV panel visual: compact site-like bottom card — meta, white timeline, times, option pills (no ±seek transport)
- [x] Seek ±N via D-pad ←/→ only (hidden chrome or timeline focus), not bottom-bar buttons
- [x] Mid-screen circular prev/play/next dock (site TV style); pause or ↓ focuses the dock
- [x] Hidden panel: ←/→ seek (prefs seconds), ↑/↓ show panel, OK play/pause, Back exit
- [x] Visible panel: D-pad focus; Back hides panel or closes overlay before exit
- [x] Overlays: dubbing, quality, connection, delivery, episodes, subtitles (when tracks exist), settings, external player
- [x] Subtitle tracks from react-native-video text tracks; preferred language persisted in player prefs
- [x] Long overlay lists scroll only when the focused row leaves the viewport; ↑/↓ navigation is rate-limited (~150ms)
- [x] Panel options chip cycles video framing (`contain` → `cover` → `fill`) without opening settings
- [x] Paused center badge; loading indicator; skip prompt button
- [x] Skip CTA is software-focused while visible: OK/`select` applies skip (native focus stays on sink); focused visual + hint «OK — пропустить»
- [x] Invisible focusable sink (`hasTVPreferredFocus`) so Android TV delivers HW keys to `useTVEventHandler` when the HUD is software-focus only
- [x] Overlay / skip / error controls do not take native TV focus away from the sink
- [x] Remote handler ignores `eventKeyAction === 0` (key-down) to avoid double seek/play

### Phone UI

- [x] Custom site-like HUD (not TV chips / not native Exo chrome): top meta + center transport pill + scrub + icon action row; top/bottom gradients
- [x] Android uses `viewType={ViewType.TEXTURE}` so video composites under React overlays; video stays in the activity window (Modal only for bottom sheets)
- [x] `controls={false}` plus config plugin forcing ExoPlayer `useController=false` (Fabric may omit the JS prop)
- [x] Gestures (RNGH): tap shows chrome immediately when hidden, hides after double-tap window when visible; double-tap L/R seeks; vertical left third brightness; vertical right third volume; horizontal scrub; gesture lock in top bar
- [x] Sheets for dubbing/quality/connection/delivery/episodes/subtitles/settings/external player (shared prefs)
- [x] Phone PiP: top-bar button calls `enterPictureInPicture`; Android `supportsPictureInPicture` via RNV Expo plugin; chrome hidden while PiP active

### Skip OP/ED (anime + Lampa)

- [x] Shared skip model: `opening` / `ending` / `intro` / `credits` via `playerSkip.ts`
- [x] Auto-skip prefs: `autoSkipOpening` covers opening+intro; `autoSkipEnding` covers ending+credits
- [x] Skip CTA prompt window: first 8s of active segment; manual seek to `segment.end`
- [x] TV timeline markers (orange opening-like, purple ending-like) on `TvPlayerPanel`
- [x] Phone scrub markers on `PhoneScrubBar`; skip chip + settings toggles on phone HUD
- [x] Anime: skip segments from `fetchAnimeSkip` API
- [x] Lampa TV serials: skip segments from `fetchLampaSkipSegments` (`intro`/`credits`); movies skip fetch cleared

### Anime watch

- [x] Dubbing/quality menus from catalog videos; switch preserves current time
- [x] Episode nav + auto-next via `router.replace`
- [x] Skip segments from `fetchAnimeSkip` API
- [x] Resume from route `startProgress` or server progress

### Lampa watch

- [x] In-player quality / connection / delivery from WatchHub links
- [x] In-player озвучка (translator) when multiple translators; switch keeps time (see `episode_picker_and_lampa_dubbing.md`)
- [x] `startProgress` handoff from source sheet and continue-watching
- [x] Throttled Lampa progress with movie coords `0,0`
- [x] On ExoPlayer `ERROR_CODE_IO_BAD_HTTP_STATUS` while on direct, auto-fallback to proxy once (and persist `directFirst: false`); friendly RU error if proxy also fails
- [x] Serial episode nav: prev/next + episodes overlay; WatchHub session (`taskId` / source / translator / seasons) in watch payload; switch reloads links in-place; auto-next on ended
- [x] Episodes overlay groups by season with «Сейчас» marker (see `episode_picker_and_lampa_dubbing.md`)
- [x] Local download playback without WatchHub session does not show episode nav
- [x] Watch payload carries `tmdbId` / `imdbId` for skip-segments API

## Acceptance Criteria

1. TV Watch: Enter play/pause, ← → seek, ↑ ↓ panel, Back closes overlay → panel → exit.
2. TV panel focus works across transport and option pills; overlays open and select with OK.
3. Anime: switch dubbing/quality keeps playback time; episode next/prev and auto-next work.
4. Lampa: quality/connection/delivery change URL with time preserved; progress resumes via payload or server; BAD_HTTP on direct auto-switches to proxy once; serials support prev/next, episode list, and auto-next.
5. Phone: TextureView + site-like HUD — play/seek/scrub/menus/gestures work without native Exo controls; watch opens landscape immersive fullscreen (status/nav bars hidden).
6. Progress syncs periodically and flushes on leave; continue-watching queries invalidate after flush.
7. Playback error shows Retry; empty source shows «Нет источника видео».
8. HLS and progressive play on Android TV via react-native-video (ExoPlayer).
9. External player opens installed Just Player / VLC / mpv (or system chooser) with stream URL and position.
10. TV + phone: anime OP/ED skip CTA, auto-skip prefs, and timeline/scrub markers work.
11. TV + phone: Lampa TV serials show intro/credits skip CTA, auto-skip, and markers; movies do not fetch skip segments.
12. TV: while skip CTA is visible, OK applies skip (software focus); button shows focused state.

## QA (from site/docs/TV_QA.md Watch)

Code-verified against acceptance criteria and remote handler (device smoke still recommended on hardware):

- [x] Watch: Enter — play/pause, ← → — seek, ↑ ↓ — panel, Back — exit (`useTvPlayerRemote`)
- [x] Watch: panel focus transport → options; Enter activates; Back hides panel
- [x] Watch: hint disappears ~2.5s (`TV_PLAYER_HINT_HIDE_MS`)
- [x] Watch: dubbing / quality / episodes / subtitles / settings / external overlays open and close with Back
- [x] Phone: TextureView playback, site-like chrome show/hide, scrub, center transport, sheets, gestures
- [x] Anime resume + auto-next; Lampa modes + source sheet startProgress
- [ ] Device: multi-minute HLS / 4K on Television_1080p
- [ ] Device: external Just Player / VLC launch with resume position

## Notes

- Source of truth: `site` `TvVideoPlayer`, `useTvPlayerRemote`, desktop `VideoPlayer` (mobile branch), `WatchPage`.
- Phone visual language follows site mobile chrome (gradients, center pill, icon row); not TV panel density. Not pixel-perfect CSS copy.
- Android TV: `useTVEventHandler` only fires when a focusable view is focused (rn-tvos#584); player HUD is software-focus, so `TvVideoPlayer` keeps a 1×1 focus sink.
- Subtitles appear only when the media container exposes text tracks (HLS/embedded); many anime sources have no CC tracks.
- For heavy 4K streams prefer «Внешний плеер» (Lampa model) if in-app ExoPlayer stutters.
- Out of scope: ambient backdrop, cast, hover scrub preview, Norigin spatial nav, IMA/ads.
