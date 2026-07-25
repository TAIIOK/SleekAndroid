import type { ExpoConfig, ConfigContext } from 'expo/config';

const isTvBuild = process.env.EXPO_TV === '1' || process.env.EXPO_TV === 'true';

/** Keep phone/TV OTA streams separate so a phone update cannot replace TV UI. */
function updatesChannel(): string {
  const fromEnv = process.env.EAS_UPDATE_CHANNEL?.trim();
  if (fromEnv) return fromEnv;
  if (isTvBuild) return 'production-tv';
  return 'production';
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: isTvBuild ? 'Sleek TV' : 'Sleek',
  slug: 'sleek',
  version: '1.0.13',
  scheme: 'sleek',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    url: 'https://u.expo.dev/5131c8a0-3572-4e6f-af54-5515652ca844',
    fallbackToCacheTimeout: 0,
    checkAutomatically: 'ON_LOAD',
    requestHeaders: {
      'expo-channel-name': updatesChannel(),
    },
  },
  ios: {
    supportsTablet: true,
    icon: './assets/expo.icon',
    bundleIdentifier: isTvBuild ? 'com.anonymous.aniversetv.tv' : 'com.anonymous.aniversetv',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#EEEAF8',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    package: isTvBuild ? 'ru.taiiok.aniverse.tv' : 'ru.taiiok.aniverse.app',
    versionCode: 14,
    intentFilters: [
      {
        action: 'VIEW',
        category: ['BROWSABLE', 'DEFAULT'],
        data: [{ scheme: 'sleek' }],
      },
    ],
  },
  extra: {
    apiUrl: 'https://api.taiiok.ru',
    watchHubUrl: 'https://watchhub.taiiok.ru',
    sitePublicUrl: 'https://sleekapp.ru',
    releasesUrl: 'https://sleekapp.ru/releases/latest.json',
    boostyUrl: 'https://boosty.to/aniverse',
    /** Set via EAS secret / local env EXPO_PUBLIC_SENTRY_DSN when ready. */
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
    sentryEnvironment: process.env.EAS_BUILD_PROFILE ?? (isTvBuild ? 'production-tv' : 'production'),
    forceTvUi: isTvBuild,
    eas: {
      projectId: '5131c8a0-3572-4e6f-af54-5515652ca844',
    },
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#13121b',
        android: {
          image: './assets/images/splash-icon.png',
          imageWidth: 76,
        },
      },
    ],
    [
      '@react-native-tvos/config-tv',
      {
        androidTVBanner: './assets/tv_icons/icon-400x240.png',
        androidTVIcon: './assets/tv_icons/icon-760x760.png',
        androidTVRequired: isTvBuild,
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          minSdkVersion: 24,
          compileSdkVersion: 36,
          targetSdkVersion: 35,
          manifestQueries: {
            package: ['com.brouken.player', 'org.videolan.vlc', 'is.xyz.mpv'],
          },
        },
      },
    ],
    'expo-web-browser',
    [
      'react-native-video',
      {
        enableAndroidPictureInPicture: true,
      },
    ],
    'expo-updates',
    './plugins/withLargeHeap.js',
    './plugins/withLetsEncryptGenYTrust.js',
    './plugins/withRnVideoDisableDefaultControls.js',
  ],
  experiments: {
    typedRoutes: false,
    reactCompiler: true,
  },
});
