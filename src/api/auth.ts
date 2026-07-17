import type { AuthResult, Account } from '@aniverse/types';

import { apiUrl, SITE_PUBLIC_URL } from '@/lib/config';
import { getOrCreateDeviceId } from '@/lib/storage';

import { request } from './client';

export async function login(loginId: string, password: string): Promise<AuthResult> {
  return request<AuthResult>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login: loginId, password }),
    skipAuth: true,
  });
}

export async function logout(): Promise<void> {
  const { getRefreshToken } = await import('@/lib/storage');
  const refresh = await getRefreshToken();
  if (refresh) {
    await request('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: refresh }),
    }).catch(() => undefined);
  }
}

export async function fetchMe(): Promise<Account> {
  const json = await request<{ user?: Account } | Account>('/api/user/me');
  if (json && typeof json === 'object' && 'user' in json) {
    return (json as { user: Account }).user;
  }
  return json as Account;
}

export interface DeviceAuthSession {
  code: string;
  expiresAt: string;
  pollIntervalSec: number;
  verifyUrl: string;
}

export interface DeviceAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export async function createDeviceAuthSession(params?: {
  deviceId?: string;
  platform?: string;
}): Promise<DeviceAuthSession> {
  const deviceId = params?.deviceId ?? (await getOrCreateDeviceId());
  const session = await request<Omit<DeviceAuthSession, 'verifyUrl'> & { verifyUrl?: string }>(
    '/api/auth/device',
    {
      method: 'POST',
      body: JSON.stringify({
        deviceId,
        platform: params?.platform ?? 'tv_android',
        siteUrl: SITE_PUBLIC_URL,
      }),
      skipAuth: true,
    },
  );

  const verifyUrl =
    session.code && SITE_PUBLIC_URL
      ? `${SITE_PUBLIC_URL}/auth/device?code=${encodeURIComponent(session.code)}`
      : (session.verifyUrl ?? '');

  return { ...session, verifyUrl };
}

export async function pollDeviceAuthSession(
  code: string,
): Promise<{ status: 'pending' } | DeviceAuthTokens> {
  const res = await fetch(apiUrl(`/api/auth/device/${encodeURIComponent(code)}`), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (res.status === 202) {
    return { status: 'pending' };
  }
  if (res.status === 410) {
    throw new Error('Код истёк — обновите QR на TV');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Ошибка ${res.status}`);
  }
  return res.json() as Promise<DeviceAuthTokens>;
}

export async function approveDeviceAuthSession(code: string): Promise<void> {
  await request(`/api/auth/device/${encodeURIComponent(code)}/approve`, { method: 'POST' });
}
