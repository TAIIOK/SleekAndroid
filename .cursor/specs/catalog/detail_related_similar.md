# Detail Related and Similar (Anime + Lampa)

## Description

Anime and Lampa (movies/series) detail screens match the site related/similar split. Franchise/collection titles are labeled **Связанные** and sorted by year. **Рекомендации** stay a separate block. **Похожее** sits last, uses genre/TMDB similar results, and excludes ids already shown in Связанные. All three render as full-width poster rails below plot/episodes/cast.

## Requirements

1. [x] Related franchise/collection titles use the heading **Связанные** on TV and phone.
2. [x] Related titles are sorted by year ascending; titles without a year go last.
3. [x] Related rails are full-width below main content (not a ~280px detail sidebar).
4. [x] Card subtitle is the year when present (anime falls back to `kind`).
5. [x] Anime related API rows accept both `relation_type` / `anime_id` / `related_anime_id` and camelCase equivalents.
6. [x] Anime similar titles load from `GET /api/animes/get/similar/:id` (genre overlap), not from `/related` or v2 personalized recommendations.
7. [x] Anime similar titles exclude ids already shown in **Связанные**.
8. [x] Anime **Рекомендации** stay a separate block when `relation_type` contains `recommend` / `рекомен`.
9. [x] Lampa similar titles load from TMDB `/similar` and exclude ids already shown in **Связанные**.
10. [x] Lampa **Рекомендации** stay a separate TMDB `/recommendations` block.
11. [x] Lampa related fetch runs for both movies and series; the block hides when the title has no TMDB collection.
12. [x] Section order is **Связанные**, **Рекомендации**, **Похожее**. Empty lists hide their blocks.

## Acceptance Criteria

- Opening an anime with franchise relations shows **Связанные** in chronological order by year.
- Opening an anime with overlapping genres shows **Похожее** last with titles that are not in the related list.
- Recommendation-type anime relations do not appear in **Связанные**.
- A movie in a TMDB collection shows **Связанные** in chronological order by year.
- **Похожее** on Lampa detail does not repeat collection titles.
- Series without a collection hide **Связанные** and still show **Похожее** / **Рекомендации** when TMDB returns them.
- Empty related, similar, or recommendation lists hide their blocks.

## Notes

- Anime related source: `AnimeRelations` via `/api/animes/get/related/:id`.
- Anime similar source: `GetRelatedByGenres` via `/api/animes/get/similar/:id`.
- Lampa related source: TMDB `belongs_to_collection` → `/collection/{id}` parts.
- Lampa similar source: `GET /tmdb/api/3/{movie|tv}/{id}/similar`.
- Lampa recommendations source: TMDB `/recommendations`.
- Source of truth: site `AnimeDetailPage` / `LampaDetailPage` related rails.
