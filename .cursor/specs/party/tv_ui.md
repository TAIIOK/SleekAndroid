# Party TV UI

## Description

TV join of совместный просмотр follows room playback instead of autoplaying, and does not overlay phone-only chips on the TV player HUD.

## Requirements

1. [x] Joining a paused room mounts the TV player paused (`autoPlay: !partyControlled`); play starts only after room sync (`partyRemoteCommand`).
2. [x] TV remote OK / ← → honor `canPlayPause` / `canSeek` and emit party play/pause/seek (same contract as phone).
3. [x] `partyRemoteCommand` applies seek + play/pause on the TV engine by sequence, matching phone.
4. [x] TV OK must emit a single play or pause: ignore OK key-up, do not also handle `select` on HUD `onKeyDown` (Pressable `onPress` is the activation), and ignore a second toggle for 800ms so a held OK cannot pause the room after a local play.
5. [x] Guest `allowGuestPause` resumes the room (`play`), not only `pause`. The room leader applies other members' play/pause/seek instead of ignoring them. Host local pause must not ignore a later guest play (paused→playing), and must not re-apply an older pause snapshot after that play.
6. [x] TV does not render `PartySyncBadge` («В прямом эфире» / «Синхронизировано»).
7. [x] TV does not render phone room chrome: left code/leave chips, top-right invite/chat. Back leaves the room via existing `onBack`.
8. [x] Phone party UI is unchanged.
9. [x] Incoming chat peeks appear over the TV player as non-focusable bubbles (no chat sheet / TextInput).
10. [x] Party room is immersive: no closed-menu sidebar anchor; Down/OK drive the player HUD instead of opening the TV sidebar.
11. [x] Party room opens as `/watch/party/[roomId]` (root watch modal, same as `/watch`) so AppShell cannot swallow HW keys.
12. [x] Party lobby lands TV focus on «Создать комнату» (guest: «Войти») with `hasTVPreferredFocus` + Left/Up→sidebar, so opening the hub from the menu closes the overlay.
13. [x] Opening `/watch` (incl. party) locks catalog/lobby `TvFocusable` so D-pad cannot stay on «Создать комнату» under the modal.
14. [x] Compact `TvPlayerFocusSink` mounts only while HUD chrome is hidden (or overlay is open). Loading/sync screens keep a sink without `onTvKey`. Visible HUD uses native-focusable Play / pills.

## Acceptance Criteria

- Connecting to a paused anime room on TV keeps video paused at the room position.
- Connecting to a playing room starts playback only after the room command, not via default autoplay.
- Guest without play/seek rights cannot locally toggle or scrub on the TV remote.
- Pause on the TV remote pauses every member; play on the TV remote resumes every member (not only the TV).
- No live/sync/code chips appear in the TV player corners.
- Phone room still shows sync badge, join code, leave, invite, and chat.
- Chat messages from other members briefly appear over video on TV.
- Down on the party player shows the TV HUD (play dock / panel), not the catalog sidebar.
- Party HUD starts visible and auto-hides ~5s while playing; Down / Up / OK bring it back; ← → seek without showing chrome (same as `/watch`).
- OK / ↓ / ← → on the party player work the same as `/watch` after the video is on screen.
- Native TV focus is the center pause/play button (white). Down reaches the bottom option pills. OK toggles playback or activates the focused pill.
- From the TV sidebar, OK on «Совместный просмотр» closes the overlay and focuses «Создать комнату» (or «Войти» for guests). Left from that control reopens the sidebar.

## Notes

- Lampa movie/series in-room player remains a fallback (same as phone).
- TV chat composer / join-code sharing remain out of scope.
- Sync logic stays in `usePartyPlaybackSync`; the TV player was ignoring party props.
- Party room lives in the root `/watch` modal (unlike the `/party` lobby). HUD keys go through `TvVideoPlayer`'s compact sink, not a 1×1 opacity-0 Pressable.
- Pause-for-all / play-only-on-TV: OK was firing twice, `allowGuestPause` did not authorize `play` on the server, and the leader ignored other members' play events.

