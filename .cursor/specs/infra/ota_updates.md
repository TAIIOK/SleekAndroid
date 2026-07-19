# OTA Updates (EAS Update)

## Description

In-app over-the-air updates for JS, styles, and assets via Expo EAS Update / `expo-updates`, without redistributing a new APK. Native code, SDK, and permission changes still require a new binary.

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
10. [ ] A release APK built after configure is distributed once so devices include the updates native module.

## Acceptance Criteria

- After linking an EAS project and installing a post-configure release APK, publishing `eas update --channel production` delivers a JS change without a new APK.
- The update prompt appears when a downloaded update is pending; «Перезапустить» applies it.
- Dev client / `expo start` continues to work (OTA path disabled).
- Changing native modules or bumping the Expo SDK still requires `prebuild:tv` + a new APK (and a new `runtimeVersion` boundary via `appVersion`).

## Notes

- OTA can update: screens, styles, assets, API client logic.
- OTA cannot update: native modules, permissions, `minSdk`, Expo SDK version.
- After the first OTA-enabled APK, further JS releases use `npm run update:production -- --message "..."`.
- Related: [`src/lib/otaUpdates.ts`](../../../src/lib/otaUpdates.ts), [`src/hooks/useOtaUpdate.ts`](../../../src/hooks/useOtaUpdate.ts), [`src/components/shell/OtaUpdatePrompt.tsx`](../../../src/components/shell/OtaUpdatePrompt.tsx).
