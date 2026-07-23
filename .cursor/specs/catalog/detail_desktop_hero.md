# Detail Hero Meta + Lampa Related Sidebar

## Description

Anime and Lampa detail heroes surface title meta in the header (not only in a duplicate sidebar). Lampa movies keep a «Связанные» related block when present; series do not show a related sidebar.

## Requirements

1. [x] Anime hero shows key meta rows (type, year, status, studio, age, rating, episode count as available) without duplicating the same block in the sidebar when meta is already in the hero.
2. [x] Lampa hero shows key info rows from `buildLampaInfoRows` (type, premiere, runtime, status, seasons, original as available) plus chips already in the hero.
3. [x] Duplicate meta list is removed from the Lampa sidebar when meta lives in the hero; movies keep «Связанные» when related items exist or are loading.
4. [x] Series detail does not show a related sidebar (`showRelatedSidebar = !isSerial && related present/pending`).
5. [x] TV focus: hero play/actions remain focusable; Left/Up from Play still reaches the app sidebar.

## Acceptance Criteria

- Opening anime/movie/series detail shows meta in the hero header.
- Movie detail shows related titles when available; series detail does not flash a related sidebar.
- Phone stacked layout remains usable.

## Notes

- Source of truth: site `AnimeDetailDesktopHero`, `LampaDetailDesktopHero`, `LampaDetailPage` `showRelatedSidebar`.
