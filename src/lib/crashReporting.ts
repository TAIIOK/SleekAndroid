import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

type Extra = {
  sentryDsn?: string;
  sentryEnvironment?: string;
};

let initialized = false;

export function initCrashReporting(): void {
  if (initialized) return;
  initialized = true;

  const extra = (Constants.expoConfig?.extra ?? {}) as Extra;
  const dsn = extra.sentryDsn?.trim();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: extra.sentryEnvironment ?? (__DEV__ ? 'development' : 'production'),
    // Native crash upload needs `@sentry/react-native/expo` plugin + EAS secrets.
    enableNative: false,
    tracesSampleRate: 0.1,
    enabled: !__DEV__ || Boolean(process.env.EXPO_PUBLIC_SENTRY_DEV),
  });
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!initialized) initCrashReporting();
  const extra = (Constants.expoConfig?.extra ?? {}) as Extra;
  if (!extra.sentryDsn?.trim()) return;

  if (error instanceof Error) {
    Sentry.captureException(error, { extra: context });
    return;
  }
  Sentry.captureException(new Error(String(error)), { extra: context });
}

export function captureMessage(message: string, context?: Record<string, unknown>): void {
  if (!initialized) initCrashReporting();
  const extra = (Constants.expoConfig?.extra ?? {}) as Extra;
  if (!extra.sentryDsn?.trim()) return;
  Sentry.captureMessage(message, { extra: context });
}

export { Sentry };
