# Client Image CDN (anime posters)

## Description

Choose between YummyAnime CDN hosts (`imgproxy.yani.tv` vs `static.yani.tv`) via the `X-Image-CDN` API header. The backend rewrites poster hostnames in JSON; the client must not rewrite hosts after the response. Preference comes from a parallel domain-root probe plus local persistence.

## Requirements

1. [x] Probe `https://imgproxy.yani.tv/` and `https://static.yani.tv/` in parallel on cold start (HEAD, ~2.5s timeout).
2. [x] Treat any HTTP response (including 403/404) as host reachable; treat network/TLS/DNS/timeout as unreachable.
3. [x] Persist preference (`static` | `imgproxy`) in AsyncStorage; expose a sync getter for the HTTP layer.
4. [x] When both hosts are up, prefer the faster RTT; on a tie prefer `imgproxy`.
5. [x] When both are down, clear preference so the header is omitted (server geo-fallback).
6. [x] Send `X-Image-CDN` on all `@aniverse/api` requests when preference is set.
7. [x] Re-probe on AppState → active, offline→online, after 24h TTL, and after N consecutive yani poster load errors.
8. [x] Render poster URLs from the API as-is (no client host rewrite).

## Acceptance Criteria

- With preference `imgproxy`, anime poster fields use `imgproxy.yani.tv`.
- With preference `static`, anime poster fields use `static.yani.tv`.
- Without preference (both probes failed), requests omit `X-Image-CDN` and still receive posters via server fallback.
- Domain-root probe that returns 403 still counts as reachable.
- Catalog / detail / episode thumbs use the same host from the API response.

## Notes

- Spec source: [`docs/client-image-cdn.md`](../../../docs/client-image-cdn.md).
- Primary files: `src/lib/imageCdn.ts`, `src/api/client.ts`, `packages/api/src/index.ts`, `src/app/_layout.tsx`, `src/components/shell/GlobalShell.tsx`, `src/components/catalog/PosterCard.tsx`.
