# Party Mobile UI

## Description

Phone polish for совместный просмотр: lobby (`/party`), room (`/party/[roomId]`), and invite (`/party/invite/[token]`). Joining a room opens an in-player watch session (YouTube-live style), not a separate lobby hub.

## Requirements

1. [x] Lobby shows hub-style title «Совместный просмотр», live stats as pills, full-width create CTA, and join-by-code in a card.
2. [x] Lobby room rows show poster thumbnail when available, privacy/member meta, Смотрят/На паузе + progress when playback exists, and a clear open/join action.
3. [x] Lobby empty sections use icon + copy (not a single muted line); guest gate offers a login CTA.
4. [x] Room route hosts a fullscreen synced video player with party session (not a standalone chat hub).
5. [x] Room chrome includes join code + leave on the left (below sync), invite share + chat on the top-right; leave must not overlap player lock/settings.
6. [x] Lobby shows an active-session banner (Вернуться / Покинуть) and leave on «Мои комнаты».
7. [x] Anime content plays in-room with playback sync (`usePartyPlaybackSync` + player party props).
8. [x] Invite screen is a centered card with poster when available, join primary, and lobby secondary; respects safe area.
9. [x] Create/join/invite navigate to `/party/[roomId]` which immediately presents the player session.
10. [x] Phone Home Quick Actions shows a leading «Комната» card when `activePartyRoomId` is valid; tap opens `/party/[roomId]` (see `home_quick_actions.md`).

## Acceptance Criteria

- Opening «Совместный просмотр» lobby on phone looks consistent with friends/library.
- Joining or creating a room with anime content opens the video player with sync controls and chat overlay.
- Chat peeks appear over video when chat sheet is closed; opening chat shows the full timeline.
- Invite preview shows room/content context before joining.
- After entering a room, phone Home Quick Actions offers a one-tap return to that room.

## Notes

- Lampa movie/series in-room player is partial (fallback to open title); anime path is fully synced.
- Kick / set-leader / privacy settings UI remain out of scope for this pass.
- Components live under `src/components/party/`; sync helpers in `src/lib/partySync.ts` + `src/hooks/usePartyPlaybackSync.ts`.
