import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const TOKEN_KEY = 'aniverse_site_token';
export const REFRESH_KEY = 'aniverse_site_refresh';
export const DEVICE_ID_KEY = 'aniverse_site_device_id';

type TokenListener = (access: string | null, refresh: string | null | undefined) => void;

const tokenListeners = new Set<TokenListener>();

/** Notify when primary tokens change (e.g. sync savedAccounts). */
export function onTokensChanged(listener: TokenListener): () => void {
  tokenListeners.add(listener);
  return () => tokenListeners.delete(listener);
}

function notifyTokensChanged(access: string | null, refresh: string | null | undefined) {
  tokenListeners.forEach((listener) => {
    try {
      listener(access, refresh);
    } catch {
      // Ignore listener errors.
    }
  });
}

function canUseSecureStore(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

async function secureGet(key: string): Promise<string | null> {
  if (!canUseSecureStore()) {
    return AsyncStorage.getItem(key);
  }
  try {
    const value = await SecureStore.getItemAsync(key);
    if (value != null) return value;
    // Migrate from legacy AsyncStorage.
    const legacy = await AsyncStorage.getItem(key);
    if (legacy) {
      await SecureStore.setItemAsync(key, legacy);
      await AsyncStorage.removeItem(key);
      return legacy;
    }
    return null;
  } catch {
    return AsyncStorage.getItem(key);
  }
}

async function secureSet(key: string, value: string): Promise<void> {
  if (!canUseSecureStore()) {
    await AsyncStorage.setItem(key, value);
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
    await AsyncStorage.removeItem(key);
  } catch {
    await AsyncStorage.setItem(key, value);
  }
}

async function secureDelete(key: string): Promise<void> {
  if (canUseSecureStore()) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // fall through
    }
  }
  await AsyncStorage.removeItem(key);
}

export async function getToken(): Promise<string | null> {
  return secureGet(TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return secureGet(REFRESH_KEY);
}

export async function setTokens(access: string, refresh?: string): Promise<void> {
  await secureSet(TOKEN_KEY, access);
  if (refresh) await secureSet(REFRESH_KEY, refresh);
  const nextRefresh = refresh ?? (await getRefreshToken());
  notifyTokensChanged(access, nextRefresh);
}

export async function clearTokens(): Promise<void> {
  await secureDelete(TOKEN_KEY);
  await secureDelete(REFRESH_KEY);
  notifyTokensChanged(null, null);
}

export async function getOrCreateDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `rn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
