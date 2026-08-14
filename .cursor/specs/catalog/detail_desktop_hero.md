# Detail Hero Meta + Lampa Related Sidebar

## Description

Anime and Lampa detail heroes surface title meta in the header (not only in a duplicate sidebar). Related/similar titles live as full-width rails below content, not as a movie-only sidebar (see `detail_related_similar.md`).

## Requirements

1. [x] Anime hero shows key meta rows (type, year, status, studio, age, rating, episode count as available) without duplicating the same block in the sidebar when meta is already in the hero.
2. [x] Lampa hero shows key info rows from `buildLampaInfoRows` (type, premiere, runtime, status, seasons, original as available) plus chips already in the hero.
3. [x] Duplicate meta list is removed from the Lampa sidebar when meta lives in the hero.
4. [x] «Связанные» hides when the title has no TMDB collection; movies and series both fetch related (see `detail_related_similar.md`).
5. [x] TV focus: hero play/actions remain focusable; Left/Up from Play still reaches the app sidebar.

## Acceptance Criteria

- Opening anime/movie/series detail shows meta in the hero header.
- Movie and series detail show related titles when a TMDB collection exists; series without a collection do not flash a Связанные block.
- Phone stacked layout remains usable.

## Notes

- Source of truth: site `AnimeDetailDesktopHero`, `LampaDetailDesktopHero`, `LampaDetailPage` related rails.
