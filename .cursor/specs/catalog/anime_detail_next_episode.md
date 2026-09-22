# Anime Detail Next Episode Countdown

## Description

Anime detail (`/anime/[id]`) shows the next episode air date and a live countdown when `GET /api/animes/:id` provides a future `nextEpisodeDate`. The block sits at the top of the hero aside (TV two-column / phone stacked after actions). Lampa movie/series detail is out of scope.

## Requirements

1. [x] `AnimeDetail` includes optional `nextEpisodeDate` and `episodesAired` from `GET /api/animes/:id`.
2. [x] The countdown block is shown only when `nextEpisodeDate` parses and is still in the future on first render, and the run is not already fully aired (`episodesTotal > 0` and `episodesAired >= episodesTotal`, for example 14 / 14). A missing total, a total of 0, or a missing aired count does not hide the block.
3. [x] The block shows heading «Следующая серия» with local date/time on the same row, and a live `ДД чч мм сс` timer prefixed with «Через» (days omitted under 24 hours).
4. [x] Episode number is `episodesAired + 1` when `episodesAired` is present.
5. [x] When the timer reaches zero the block shows «Серия вышла» instead of hiding immediately.
6. [x] If the date is missing or already in the past on first render, the block is not shown.
7. [x] Phone stacked layout places the block at the top of the hero aside (after play/actions).
8. [x] TV places the block at the top of the hero right aside; the date is not duplicated in info rows.
9. [x] The block is display-only (no extra TV focus targets). Countdown ticks stay inside `NextEpisodeCountdown` so the rest of the detail screen does not re-render every second.

## Acceptance Criteria

- Opening an ongoing anime with a future `nextEpisodeDate` shows the date and a ticking countdown on phone and TV.
- Anime without `nextEpisodeDate`, with a past date, or with every announced episode already aired (`episodesAired >= episodesTotal > 0`) does not show the block.
- An ongoing title that still has unaired episodes (13 / 14) with a future date still shows the block.
- After the countdown hits zero, the copy switches to «Серия вышла».
- The rest of the detail page does not re-render every second.

## Notes

- Source: backend `Anime.nextEpisodeDate` (YummyAnime `episodes.next_date`), ISO `2006-01-02T15:04:05.000Z`.
- Parser also accepts unix timestamps and nested `nextAiringEpisode` (iOS `CatalogAPI` compatibility).
- Web parity: `site` `NextEpisodeCountdown` + `lib/nextEpisode.ts`.
- Lampa/TMDB serials do not expose a computed next-episode datetime and are not covered here.
