# Video Player (Anime + Lampa)

Native TV and phone player parity with web (`site/` TvVideoPlayer + desktop VideoPlayer + WatchPage).

## Description

Port the full watch experience into `aniverse-tv` on `expo-video`: TV remote HUD with panel focus and overlays, phone custom HUD with gestures, anime dubbing/quality/episodes, Lampa quality/connection/delivery, progress throttle + resume, player prefs, OP/ED skip, and auto-next.

## Requirements

### Engine and prefs

- [x] `useNativeVideoEngine` wraps `expo-video` with play/pause, seek, rate, contentFit, loading/error/retry, startTime resume, skip segments, ended → auto-next
- [x] Player preferences persist in AsyncStorage (`aniverse-player-prefs`)
- [x] Throttled anime and Lampa progress PUT with flush on unmount; Lampa uses 1440s fallback duration when unknown
- [x] `expo-video` listed in Expo plugins; README documents `expo-video`

### TV UI and remote

- [x] Panel: timeline → transport → options; auto-hide 3s while playing; hint ~2.5s
- [x] Hidden panel: ←/→ seek (prefs seconds), ↑/↓ show panel, OK play/pause, Back exit
- [x] Visible panel: D-pad focus; Back hides panel or closes overlay before exit
- [x] Overlays: dubbing, quality, connection, delivery, episodes, settings
- [x] Paused center badge; loading indicator; skip prompt button

### Phone UI

- [x] Custom HUD (not only native controls): transport, timeline scrub, back
- [x] Gestures: tap play/pause, horizontal seek; volume via player.volume when gesture applies
- [x] Sheets for dubbing/quality/episodes/settings (shared prefs)

### Anime watch

- [x] Dubbing/quality menus from catalog videos; switch preserves current time
- [x] Episode nav + auto-next via `router.replace`
- [x] Skip segments from `fetchAnimeSkip` API
- [x] Resume from route `startProgress` or server progress

### Lampa watch

- [x] In-player quality / connection / delivery from WatchHub links
- [x] `startProgress` handoff from source sheet and continue-watching
- [x] Throttled Lampa progress with movie coords `0,0`

## Acceptance Criteria

1. TV Watch: Enter play/pause, ← → seek, ↑ ↓ panel, Back closes overlay → panel → exit.
2. TV panel focus works across transport and option pills; overlays open and select with OK.
3. Anime: switch dubbing/quality keeps playback time; episode next/prev and auto-next work.
4. Lampa: quality/connection/delivery change URL with time preserved; progress resumes via payload or server.
5. Phone: custom HUD play/seek/menus work without relying solely on native controls.
6. Progress syncs periodically and flushes on leave; continue-watching queries invalidate after flush.
7. Playback error shows Retry; empty source shows «Нет источника видео».

## QA (from site/docs/TV_QA.md Watch)

- [ ] Watch: Enter — play/pause, ← → — seek, ↑ ↓ — panel, Back — exit
- [ ] Watch: panel focus transport → options; Enter activates; Back hides panel
- [ ] Watch: hint disappears ~2.5s
- [ ] Watch: dubbing / quality / episodes / settings overlays open and close with Back
- [ ] Phone: scrub, transport, sheets, gestures
- [ ] Anime resume + auto-next; Lampa modes + source sheet startProgress

## Notes

- Source of truth: `site` `TvVideoPlayer`, `useTvPlayerRemote`, desktop `VideoPlayer`, `WatchPage`.
- Visual language uses `colors` / glass tokens; not pixel-perfect CSS copy.
- Out of scope: ambient backdrop, PiP/cast, hover scrub preview, Norigin spatial nav.
