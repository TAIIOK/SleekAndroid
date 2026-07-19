# AniVerse Native (react-native-tvos)

Нативное приложение **Android phone + Android TV** (один APK) на базе Expo SDK 56 и `react-native-tvos`.

> В монорепо пакет называется `aniverse-tv` (историческое имя). Это и есть native-клиент из плана `aniverse-native`.

## Стек

| Слой | Технология |
|------|------------|
| UI | React Native + expo-router |
| TV focus | `Platform.isTV`, `Pressable`, `useTVEventHandler` |
| API | `@aniverse/api`, `@aniverse/types`, `@aniverse/playback` |
| Auth | AsyncStorage + JWT refresh |
| TV login | Device-code / QR (`DeviceQrLogin`) |
| Player | `react-native-video` (ExoPlayer / Media3, MIT) + external apps |
| Кеш | `@tanstack/react-query` |

## Платформы

| Платформа | Клиент |
|-----------|--------|
| Android phone | `aniverse-tv` APK |
| Android TV / Fire TV | тот же APK (`EXPO_TV=1` prebuild) |
| Smart TV браузеры | [`site/`](../site/) web + TVShell |
| Capacitor | [`site/android/`](../site/android/) — **заморожен** |

## Разработка

```bash
# из корня монорепо
npm install

cd aniverse-tv
npm run postinstall   # symlink expo-router для @expo/cli (npm workspaces)
npm run start

# Android phone emulator
npm run android

# Android TV (leanback launcher + banner)
# запускает AVD Television_1080p (не phone)
npm run prebuild:tv
npm run android:tv
```

API URL задаётся в `app.json` → `expo.extra`:

```json
{
  "apiUrl": "https://api.taiiok.ru",
  "watchHubUrl": "https://watchhub.taiiok.ru",
  "sitePublicUrl": "https://preview.taiiok.ru"
}
```

После смены native-зависимостей нужен `npm run prebuild:tv` / `npm run android:tv`.

Android-сборка ожидает JDK 17 (`openjdk@17`); JDK 25 ломает CMake у native-модулей. `scripts/with-expo-path.js` сам подставляет Homebrew `openjdk@17`, если он установлен.

## OTA-обновления (без новой APK)

JS, стили и ассеты можно пушить через [EAS Update](https://docs.expo.dev/eas-update/introduction/) — пользователям не нужна новая APK. Смена native-модулей / SDK / permissions по-прежнему требует пересборки APK.

### Один раз: привязать EAS-проект

```bash
npx eas-cli@latest login
npm run eas:configure   # запишет real projectId и updates.url в app.json
npm run prebuild:tv
npm run android:release # раздать эту APK один раз
```

`app.json` уже содержит `extra.eas.projectId` и `updates.url` для проекта Sleek. Если переносите на другой Expo-аккаунт — снова запустите `npm run eas:configure`.

### Публикация обновления

```bash
# production (sideload / production_android)
npm run update:production -- --message "Fix search focus"

# preview-сборки
npm run update:preview -- --message "QA: new home rail"
```

Канал для локальных release-сборок задан в `app.json` → `updates.requestHeaders["expo-channel-name"]` = `production`.

### Как проверить

1. Установить release APK, собранную после `eas:configure`.
2. Опубликовать update на канал `production`.
3. Перезапустить приложение — появится диалог «Доступно обновление» → «Перезапустить», либо update применится на следующем cold start.

В dev (`expo start`) OTA отключен.

## Сборка release APK (sideload)

```bash
cd aniverse-tv

# 1. Prebuild с TV-манифестом (LEANBACK_LAUNCHER, banner)
npm run prebuild:tv

# 2. Release APK
npm run android:release
# → android/app/build/outputs/apk/release/app-release.apk
```

### Подпись release

1. Создайте keystore (храните вне git):

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore aniverse-release.keystore \
  -alias aniverse -keyalg RSA -keysize 2048 -validity 10000
```

2. Добавьте в `android/gradle.properties` (не коммитьте пароли в git):

```properties
ANIVERSE_UPLOAD_STORE_FILE=aniverse-release.keystore
ANIVERSE_UPLOAD_KEY_ALIAS=aniverse
ANIVERSE_UPLOAD_STORE_PASSWORD=***
ANIVERSE_UPLOAD_KEY_PASSWORD=***
```

3. Настройте `android/app/build.gradle` signingConfigs (после prebuild) и пересоберите.

Или используйте EAS:

```bash
eas build --profile production_android --platform android
```

## TV MVP scope

Включено: Home, Anime, Movies, Series, Search, History, Profile, Watch (anime), Device QR auth.

Скрыто на TV (`Platform.isTV`): manga, downloads, feed, party — см. `src/lib/tvRoutes.ts`.

## Структура

```
src/
  api/           # HTTP client, auth, catalog, progress
  app/           # expo-router screens
  components/    # PosterRail, AppShell, VideoPlayer, DeviceQrLogin
  lib/           # storage, config, tvRoutes
  providers/     # AuthProvider, QueryProvider
```

## QA

- Android TV Emulator (API 31+, Leanback)
- Реальная приставка: D-pad навигация, QR login, HLS playback
- Телефон: таб-бар, password login, те же API

См. также [`site/docs/TV_QA.md`](../site/docs/TV_QA.md) для web TV регрессии.

## Troubleshooting

### `Cannot find module 'expo-router/...'` или `@expo/metro-runtime`

npm workspaces держит Expo-пакеты в `aniverse-tv/node_modules`, а `@expo/cli` из корня монорепо ищет их в `AniverseWeb/node_modules/`.

**Исправление (уже в проекте):**
1. `@expo/metro-runtime` добавлен как прямая зависимость
2. `npm run postinstall` → `scripts/link-workspace-deps.js` (symlink всех workspace-пакетов в корень)
3. Скрипты `start` / `android` / `prebuild` идут через `scripts/with-expo-path.js`

После `npm install` в корне:

```bash
cd aniverse-tv
npm run postinstall
npm run start
```
