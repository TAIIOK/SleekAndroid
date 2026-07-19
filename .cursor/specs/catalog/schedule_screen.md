# Schedule Screen

TV lean-back schedule of anime air dates for the current / next week.

## Description

Show `/api/base/schedule` results grouped by weekday with poster rails. Accessible from the TV sidebar.

## Requirements

- [x] Route `/schedule` allowed in `tvRoutes` and listed in TV sidebar nav
- [x] Fetch schedule with `week` (0 current / 1 next) and `limit`
- [x] Group entries by local air day; day rails titled Сегодня / Завтра / weekday
- [x] Poster press opens `/anime/[id]`
- [x] Loading, empty, and error/retry states

## Acceptance Criteria

1. Opening Расписание shows the current week label and day rails with titles.
2. Switching to «Следующая» reloads with `week=1`.
3. Focusing a poster and pressing OK opens anime detail.
4. Empty weeks show a clear empty message.

## Notes

- API: `GET /api/base/schedule?week=&limit=`
- Source of truth for payload: AniVerseGo `AnimeSchedule` (`anime_id`, `next_date`, nested `anime`).
