# Device QR login + catalog deeplink (native)

## Description

Native Android phone/TV clients mirror site/backend device-auth decline and catalog connect: phone can approve/decline TV codes; bot Mini App opens `sleek://add-media-server` into the app.

## Requirements

1. [x] `POST /api/auth/device/:code/decline` client (`declineDeviceAuthSession`).
2. [x] `GET /api/user/catalog-deeplink` client (`fetchCatalogDeeplink`).
3. [x] `/auth/device` auto-approves when authenticated with a code; shows **Отклонить**.
4. [x] TV QR poll treats 410 as expired/declined and offers **Обновить QR**.
5. [x] App registers `scheme: sleek` + Android intent filter.
6. [x] Route `/add-media-server` handles `sleek://add-media-server?url=&name=` and persists unlock.
7. [x] Route `/catalog/connect` fetches JWT deeplink and navigates to `/add-media-server`.

## Acceptance Criteria

- Declining on phone makes TV poll fail with 410 and show refresh CTA.
- Approving after login auto-confirms without a second tap.
- Opening bot «Открыть в Sleek» launches the APK on `/add-media-server` with server URL.

## Notes

- Backend: AniVerseGo decline + catalog-deeplink.
- Site: `/auth/device-scan`, `/catalog/connect`.
