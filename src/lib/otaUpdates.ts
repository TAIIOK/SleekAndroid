import * as Updates from 'expo-updates';

export type OtaCheckResult =
  | { status: 'disabled' }
  | { status: 'up_to_date' }
  | { status: 'ready'; isNew: boolean }
  | { status: 'error'; message: string };

export function isOtaEnabled(): boolean {
  if (__DEV__) return false;
  return Updates.isEnabled;
}

/** Check for and download a remote update. No-op in dev / when updates are disabled. */
export async function checkAndFetchOtaUpdate(): Promise<OtaCheckResult> {
  if (!isOtaEnabled()) {
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
  await Updates.reloadAsync();
}
