# Client Refresh Posters (anime)

## Description

When an anime poster is really dead (implausible URL or load failure on the preferred CDN host), call `POST /api/animes/:id/refresh-posters` so the backend can drop bad poster rows and resync from YummyAnime. Distinct from CDN host probing (`X-Image-CDN`).

## Requirements

1. [x] Call refresh only after a real poster failure (not on every card open, not batched).
2. [x] Deduplicate: at most one in-flight request per `animeId`.
3. [x] Honor per-anime `cooldown` / `retryAfterSeconds` from the 200 response.
4. [x] On HTTP 429, pause all refresh globally for `Retry-After` / `retry_after` seconds.
5. [x] After success (or cooldown with posters), update UI poster URL and invalidate anime detail queries.
6. [x] Prefer non-AVIF / plausible poster URLs when picking display and refresh payload URLs (iOS `CatalogPosterURL` parity).
7. [x] Keep CDN re-probe on consecutive yani errors separate from content refresh.

## Acceptance Criteria

- Broken host like `https://source2` triggers refresh (when `animeId` is known) and is not rendered as a valid image URL.
- Preferred-host / imgproxy load `onError` triggers refresh; catalog is not walked with refresh calls.
- After refresh returns new `posters`, catalog cards and anime hero show the updated URL without a full app restart.
- 429 stops further refresh attempts until the pause elapses.

## Notes

- Spec source: [`docs/client-refresh-posters.md`](../../../docs/client-refresh-posters.md).
- Related: [`client_image_cdn.md`](client_image_cdn.md).
- Primary files: `src/lib/poster.ts`, `src/lib/animePosterRefresh.ts`, `src/api/catalog.ts`, `src/components/catalog/PosterCard.tsx`.
