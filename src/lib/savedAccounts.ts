import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Account } from '@aniverse/types';

import { getRefreshToken, getToken, onTokensChanged } from '@/lib/storage';

export const SAVED_ACCOUNTS_KEY = 'aniverse_tv_saved_accounts';
const MAX_SAVED_ACCOUNTS = 5;

let tokenSyncBound = false;

/** Keep the active saved-account JWT in sync when the API client refreshes tokens. */
export function bindSavedAccountTokenSync(): void {
  if (tokenSyncBound) return;
  tokenSyncBound = true;
  onTokensChanged((access, refresh) => {
    if (!access) return;
    void syncTokensForAccessToken(access, refresh ?? undefined);
  });
}

export interface SavedAccount {
  id: string;
  nickname?: string;
  email?: string;
  avatar?: string;
  accessToken: string;
  refreshToken?: string;
  lastUsedAt: number;
}

async function readRaw(): Promise<SavedAccount[]> {
  try {
    const raw = await AsyncStorage.getItem(SAVED_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedAccount =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as SavedAccount).id === 'string' &&
        typeof (item as SavedAccount).accessToken === 'string',
    );
  } catch {
    return [];
  }
}

async function writeRaw(accounts: SavedAccount[]): Promise<void> {
  await AsyncStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts));
}

export async function getSavedAccounts(): Promise<SavedAccount[]> {
  const accounts = await readRaw();
  return accounts.sort((a, b) => b.lastUsedAt - a.lastUsedAt);
}

export async function getSavedAccount(id: string): Promise<SavedAccount | undefined> {
  const accounts = await readRaw();
  return accounts.find((account) => account.id === id);
}

export async function getSavedAccountByAccessToken(
  accessToken: string,
): Promise<SavedAccount | undefined> {
  const accounts = await readRaw();
  return accounts.find((account) => account.accessToken === accessToken);
}

export function accountFromSaved(saved: SavedAccount): Account {
  const numericId = Number(saved.id);
  return {
    id: Number.isFinite(numericId) ? numericId : 0,
    nickname: saved.nickname,
    email: saved.email,
    avatar: saved.avatar,
  };
}

export async function saveAccount(
  entry: Omit<SavedAccount, 'lastUsedAt'> & { lastUsedAt?: number },
): Promise<void> {
  const accounts = await readRaw();
  const now = entry.lastUsedAt ?? Date.now();
  const next: SavedAccount = { ...entry, lastUsedAt: now };
  const without = accounts.filter((account) => account.id !== entry.id);
  without.unshift(next);
  await writeRaw(without.slice(0, MAX_SAVED_ACCOUNTS));
}

export async function touchSavedAccount(id: string): Promise<void> {
  const account = await getSavedAccount(id);
  if (!account) return;
  await saveAccount({ ...account, lastUsedAt: Date.now() });
}

export async function removeSavedAccount(id: string): Promise<void> {
  const accounts = await readRaw();
  await writeRaw(accounts.filter((account) => account.id !== id));
}

export async function persistCurrentAccount(user: Account): Promise<void> {
  const accessToken = await getToken();
  if (!accessToken || user.id == null) return;
  await saveAccount({
    id: String(user.id),
    nickname: user.nickname,
    email: user.email,
    avatar: typeof user.avatar === 'string' ? user.avatar : undefined,
    accessToken,
    refreshToken: (await getRefreshToken()) ?? undefined,
  });
}

/**
 * After silent refresh, primary storage already has new tokens.
 * Update whichever saved account still holds the previous access token,
 * or the most recently used account if the new access token is unknown.
 */
export async function syncTokensForAccessToken(
  accessToken: string,
  refreshToken?: string,
): Promise<void> {
  const accounts = await readRaw();
  if (!accounts.length) return;

  const byNew = accounts.find((account) => account.accessToken === accessToken);
  if (byNew) {
    if (refreshToken && byNew.refreshToken !== refreshToken) {
      await saveAccount({ ...byNew, refreshToken, lastUsedAt: byNew.lastUsedAt });
    }
    return;
  }

  // Refresh replaced the access token — update the most recently used entry that
  // still has a refresh token (or the newest overall).
  const sorted = [...accounts].sort((a, b) => b.lastUsedAt - a.lastUsedAt);
  const target = sorted[0];
  if (!target) return;
  await saveAccount({
    ...target,
    accessToken,
    refreshToken: refreshToken ?? target.refreshToken,
    lastUsedAt: target.lastUsedAt,
  });
}
