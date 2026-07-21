export interface MediaServerDeepLinkPayload {
  serverUrl: string;
  serverName?: string;
  autoFetch: boolean;
}

/**
 * Parse `sleek://add-media-server?url=…&name=…` (same shape as iOS Sleek / bot deeplink).
 */
export function parseMediaServerDeepLink(url: string | null | undefined): MediaServerDeepLinkPayload | null {
  if (!url?.trim()) return null;

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  if (!isAddMediaServerLink(parsed)) return null;

  const serverUrl =
    firstQuery(parsed, ['url', 'server_url', 'server', 'host'])?.trim() ?? '';
  if (!serverUrl) return null;

  const serverName = firstQuery(parsed, ['name', 'server_name', 'title'])?.trim() || undefined;
  const autoRaw = firstQuery(parsed, ['autofetch', 'autoconnect', 'auto']);
  const autoFetch = autoRaw == null ? true : parseBool(autoRaw) ?? true;

  return { serverUrl, serverName, autoFetch };
}

function isAddMediaServerLink(url: URL): boolean {
  const scheme = (url.protocol || '').replace(/:$/, '').toLowerCase();
  const host = (url.hostname || '').toLowerCase();
  const path = (url.pathname || '').toLowerCase();

  if (scheme === 'sleek') {
    if (host === 'add-media-server' || host === 'media-server' || host === 'addserver') {
      return true;
    }
    return path.includes('add-media-server');
  }

  return path.includes('/add-media-server');
}

function firstQuery(url: URL, keys: string[]): string | null {
  for (const key of keys) {
    const value = url.searchParams.get(key);
    if (value && value.trim()) return value;
  }
  return null;
}

function parseBool(raw: string): boolean | null {
  const lower = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(lower)) return true;
  if (['0', 'false', 'no', 'off'].includes(lower)) return false;
  return null;
}
