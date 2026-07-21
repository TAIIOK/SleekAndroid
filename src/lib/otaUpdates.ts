type UpdatesModule = typeof import('expo-updates');

let cachedUpdates: UpdatesModule | null | undefined;

export function getUpdatesModule(): UpdatesModule | null {
  if (cachedUpdates !== undefined) return cachedUpdates;
  try {
    // String literal required so Metro includes the module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedUpdates = require('expo-updates') as UpdatesModule;
  } catch {
    cachedUpdates = null;
  }
  return cachedUpdates;
}

export type OtaCheckResult =
  | { status: 'disabled' }
  | { status: 'up_to_date' }
  | { status: 'ready'; isNew: boolean }
  | { status: 'error'; message: string };

export function isOtaEnabled(): boolean {
  if (__DEV__) return false;
  const Updates = getUpdatesModule();
  if (!Updates) return false;
  return Updates.isEnabled;
}

/** Check for and download a remote update. No-op in dev / when updates are disabled. */
export async function checkAndFetchOtaUpdate(): Promise<OtaCheckResult> {
  if (!isOtaEnabled()) {
    return { status: 'disabled' };
  }

  const Updates = getUpdatesModule();
  if (!Updates) {
    return { status: 'disabled' };
  }

  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) {
      return { status: 'up_to_date' };
    }

    const fetched = await Updates.fetchUpdateAsync();
    if (fetched.isNew) {
      return { status: 'ready', isNew: true };
    }

    return { status: 'up_to_date' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { status: 'error', message };
  }
}

/** Apply a pending update by reloading the JS runtime. */
export async function reloadWithOtaUpdate(): Promise<void> {
  if (!isOtaEnabled()) return;
  const Updates = getUpdatesModule();
  if (!Updates) return;
  await Updates.reloadAsync();
}
