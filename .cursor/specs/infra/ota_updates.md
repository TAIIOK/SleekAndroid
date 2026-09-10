# OTA Updates (EAS Update)

## Description

In-app over-the-air updates for JS, styles, and assets via Expo EAS Update / `expo-updates`, without redistributing a new APK. Native code, SDK, and permission changes still require a new binary. Sideloaded Android binaries are updated from inside the app: download the APK to cache and launch the system installer (no browser).

## Requirements

1. [x] `expo-updates` is installed and listed as an Expo config plugin.
2. [x] `runtimeVersion` uses the `appVersion` policy (matches `expo.version` / APK `versionName`).
3. [x] Update channel for local release builds is `production` via `updates.requestHeaders["expo-channel-name"]`.
4. [x] EAS build profiles declare channels: `development`, `preview`, `production`.
5. [x] On launch (release builds), the app checks for and downloads updates in the background without blocking splash (`fallbackToCacheTimeout: 0`).
6. [x] When an update is ready, a TV-focusable prompt offers «Перезапустить» (`reloadAsync`) or «Позже».
7. [x] OTA helpers are no-ops in `__DEV__` and when `Updates.isEnabled === false`.
8. [x] Publish scripts exist: `update:production`, `update:preview`; one-time link via `eas:configure`.
9. [x] `extra.eas.projectId` and `updates.url` are set to the Sleek EAS project.
10. [ ] A release APK built after configure is distributed once so devices include the updates native module. (Checklist: `docs/OTA_SHIP.md`; verify with `npm run ota:preflight`)
11. [x] Binary APK updates compare `versionCode` to `releases/latest.json` (site CDN) via `NativeApkUpdatePrompt`.
12. [x] Android manifest declares `REQUEST_INSTALL_PACKAGES` so the app can start the package installer.
13. [x] Tapping «Обновить» downloads the matching APK (`phoneApkUrl` / `tvApkUrl`) into app cache with visible progress.
14. [x] After download, the app launches the system installer via a content URI (`ACTION_VIEW`, APK MIME, `FLAG_GRANT_READ_URI_PERMISSION`).
15. [x] If the installer is blocked (unknown sources), the app opens `MANAGE_UNKNOWN_APP_SOURCES` for this package, then retries; browser download remains a fallback.
16. [x] Settings → «Проверить обновления» re-fetches `latest.json`. If a newer APK exists, the same prompt appears; if current, an alert says the version is up to date.

## Acceptance Criteria

- After linking an EAS project and installing a post-configure release APK, publishing `eas update --channel production` delivers a JS change without a new APK.
- The update prompt appears when a downloaded update is pending; «Перезапустить» applies it.
- Dev client / `expo start` continues to work (OTA path disabled).
- Changing native modules or bumping the Expo SDK still requires `prebuild:tv` + a new APK (and a new `runtimeVersion` boundary via `appVersion`).
- On a sideloaded Android/TV release, a newer `latest.json` shows a prompt; «Обновить» downloads the APK in-app and opens the installer without leaving to a browser.
- Progress is visible during APK download; «Позже» / cancel aborts an in-flight download.
- Settings can trigger the same binary-update check; an already-current version reports that no update is needed.

## Notes

- OTA can update: screens, styles, assets, API client logic.
- OTA cannot update: native modules, permissions, `minSdk`, Expo SDK version.
- After the first OTA-enabled APK, further JS releases use `npm run update:production -- --message "..."`.
- In-app APK install cannot complete without user confirmation in the system installer, and Android 8+ may require «установка из этого источника».
- Related: [`src/lib/otaUpdates.ts`](../../../src/lib/otaUpdates.ts), [`src/hooks/useOtaUpdate.ts`](../../../src/hooks/useOtaUpdate.ts), [`src/components/shell/OtaUpdatePrompt.tsx`](../../../src/components/shell/OtaUpdatePrompt.tsx), [`src/lib/nativeApkUpdate.ts`](../../../src/lib/nativeApkUpdate.ts), [`src/hooks/useNativeApkUpdate.ts`](../../../src/hooks/useNativeApkUpdate.ts), [`src/components/shell/NativeApkUpdatePrompt.tsx`](../../../src/components/shell/NativeApkUpdatePrompt.tsx).
