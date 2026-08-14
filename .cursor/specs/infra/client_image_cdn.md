# Client Image CDN (anime posters)

## Description

Choose between YummyAnime CDN hosts (`imgproxy.yani.tv` vs `static.yani.tv`) via the `X-Image-CDN` API header. The backend rewrites poster hostnames in catalog JSON. Display-layer rewrite (`rewritePosterURL`) is allowed for library/history/continue snapshots and as a safety net (site/Sleek `posterUrl` parity). Preference comes from a parallel GET probe of a known poster path plus local persistence. Unknown preference always chooses `imgproxy` so TV/Android never wait on Cloudflare `static`.

## Requirements

1. [x] Probe `https://imgproxy.yani.tv/posters/huge/1636885510.avif` and `https://static.yani.tv/posters/huge/1636885510.avif` in parallel on cold start (GET with `Range: bytes=0-2047`, ~2.5s timeout).
2. [x] Treat HTTP 2xx (including 206) as host reachable; treat other HTTP statuses and network/TLS/DNS/timeout as unreachable.
3. [x] Persist preference (`static` | `imgproxy`) in AsyncStorage; expose a sync getter for the HTTP layer. Do not restore sticky `static` across launches.
4. [x] When both hosts are up, prefer the faster RTT; on a tie prefer `imgproxy`.
5. [x] When both are down, keep `imgproxy` so `X-Image-CDN` is still sent (do not omit the header).
6. [x] Send `X-Image-CDN` on all `@aniverse/api` requests; default to `imgproxy` before the first probe finishes.
7. [x] Re-probe on AppState → active, offline→online, after 24h TTL, and after N consecutive yani poster load errors.
8. [x] Catalog API JSON stays as returned (`X-Image-CDN`). Display layer rewrites yani hosts (`rewritePosterURL`) to the preferred CDN; unknown preference and `static` unhealthy both rewrite to imgproxy.
9. [x] Static / `img.yani.tv` poster load errors mark static unhealthy and force imgproxy for subsequent display + `X-Image-CDN`.
10. [x] A `static` probe that 302s onto `imgproxy.yani.tv` counts as static unavailable.

## Acceptance Criteria

- With preference `imgproxy`, anime poster fields use `imgproxy.yani.tv`.
- With preference `static`, anime poster fields use `static.yani.tv`.
- When both probes fail, requests still send `X-Image-CDN: imgproxy` and display rewrites yani hosts to imgproxy.
- Poster GET probe that returns 403 counts as unreachable; 206 counts as reachable.
- Catalog / detail / episode thumbs use the same host from the API response.
- Continue watching and catalog `PosterCard` rewrite yani hosts at display time; unknown preference uses imgproxy, not the original Cloudflare host.
- A failed `static.yani.tv` image load switches display + header to imgproxy without waiting for the 5-error reprobe.
- A stored `static` preference is not restored on the next launch; the client probes again (and defaults to imgproxy until then).

## Notes

- Spec source: [`docs/client-image-cdn.md`](../../../docs/client-image-cdn.md).
- iOS parity: Sleek `ImageCDNPreferenceService` (GET probe path, Range, no sticky static, rewrite unknown → imgproxy).
- Primary files: `src/lib/imageCdn.ts`, `src/lib/posterDisplay.ts`, `src/hooks/usePosterDisplayUri.ts`, `src/api/client.ts`, `src/app/_layout.tsx`, `src/components/catalog/PosterCard.tsx`, `src/components/home/ContinueWatchingRow.tsx`.
