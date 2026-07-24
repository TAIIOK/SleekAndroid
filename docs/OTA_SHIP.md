# Shipping the first OTA-enabled APK

1. `node scripts/ota-preflight.js` — config sanity.
2. `npm run android:release:all` — builds phone + TV release APKs into `dist/`.
3. Sideload / host `dist/sleek.apk` and `dist/sleek-tv.apk` (or upload to your CDN + `releases/latest.json`).
4. On a device with that APK, run `npm run update:all -- "smoke OTA"` and restart the app — expect the update prompt.

After step 3, mark req #10 in `.cursor/specs/infra/ota_updates.md` as done.
