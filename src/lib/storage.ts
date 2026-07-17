import AsyncStorage from '@react-native-async-storage/async-storage';

export const TOKEN_KEY = 'aniverse_site_token';
export const REFRESH_KEY = 'aniverse_site_refresh';
export const DEVICE_ID_KEY = 'aniverse_site_device_id';

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(REFRESH_KEY);
}

export async function setTokens(access: string, refresh?: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, access);
  if (refresh) await AsyncStorage.setItem(REFRESH_KEY, refresh);
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY]);
}

export async function getOrCreateDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `rn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
