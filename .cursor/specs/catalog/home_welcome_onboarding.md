# Home Welcome Onboarding Modal

## Description

On the first visit to Home (when catalog home settings were never saved), show a welcome modal so the user can choose which sections to show (anime, movies, series), which feeds belong in each section, and the order of those sections. Choices persist through existing `CatalogHomeConfig` (AsyncStorage + server sync).

## Requirements

1. [x] When `CatalogHomeConfig` is not configured, Home shows a welcome onboarding modal after catalog data is available.
2. [x] Authenticated users wait for the first home-config sync attempt before the welcome modal is shown.
3. [x] The modal lets the user enable or disable sections: «Аниме», «Фильмы», «Сериалы».
4. [x] For each enabled section, the modal lets the user select which feeds/showcases/sections appear on Home.
5. [x] The modal lets the user set the order of sections on Home (`homeSectionOrder`).
6. [x] Saving marks config as `configured: true` and uses the same persist path as «Настройки главной».
7. [x] «Пропустить» saves sensible defaults and does not show the welcome modal again.
8. [x] TV controls use `TvFocusable` / D-pad; Escape/Back acts as skip with defaults.
9. [x] Later edits remain available via existing `HomeSettingsSheet`.
10. [x] Home settings include `hideAsianLiveAction` toggle; Lampa section fetches send `excludeCjk` when enabled (except top/recommendations exclusions).

## Acceptance Criteria

- First open of Home with empty local/server home config shows the welcome modal.
- Returning users with `configured: true` never see the welcome modal again.
- Skip and Done both persist config so the modal does not reappear on reload.
- Asian live-action filter applies to Lampa home rails when enabled.

## Notes

- Reuse `buildSettingsDraft`, persist from `useHomeCatalogConfig`, patterns from `HomeSettingsSheet`.
- Source: site `HomeWelcomeModal`, `hide_asian_live_action`.
