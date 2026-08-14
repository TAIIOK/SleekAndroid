import { getToken, onTokensChanged } from '@/lib/storage';

/** Sync token for Socket.IO (site uses sync localStorage). */
let cachedAccessToken: string | null = null;
let hydrated = false;

onTokensChanged((access) => {
  cachedAccessToken = access;
  hydrated = true;
});

export function getTokenSync(): string | null {
  return cachedAccessToken;
}

export async function hydrateTokenCache(): Promise<string | null> {
  if (hydrated && cachedAccessToken) return cachedAccessToken;
  cachedAccessToken = await getToken();
  hydrated = true;
  return cachedAccessToken;
}

export function setTokenCache(access: string | null): void {
  cachedAccessToken = access;
  hydrated = true;
}
