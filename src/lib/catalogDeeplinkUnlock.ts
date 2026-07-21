import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'sleek_catalog_deeplink_unlocked';

/** Persist unlock after a valid sleek://add-media-server open (parity with iOS CatalogSessionGate). */
export async function markCatalogDeeplinkUnlocked(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    /* ignore */
  }
}

export async function isCatalogDeeplinkUnlocked(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    return false;
  }
}
