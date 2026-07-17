import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DownloadPreferences {
  directFirst: boolean;
  preferStreamOverFile: boolean;
}

const STORAGE_KEY = 'aniverse-download-prefs';

const DEFAULTS: DownloadPreferences = {
  directFirst: true,
  preferStreamOverFile: true,
};

let memoryCache: DownloadPreferences | null = null;

export function getDownloadPreferencesSync(): DownloadPreferences {
  return memoryCache ? { ...memoryCache } : { ...DEFAULTS };
}

export async function loadDownloadPreferences(): Promise<DownloadPreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      memoryCache = { ...DEFAULTS };
      return { ...DEFAULTS };
    }
    const parsed = JSON.parse(raw) as Partial<DownloadPreferences>;
    memoryCache = {
      directFirst: parsed.directFirst ?? DEFAULTS.directFirst,
      preferStreamOverFile: parsed.preferStreamOverFile ?? DEFAULTS.preferStreamOverFile,
    };
    return { ...memoryCache };
  } catch {
    memoryCache = { ...DEFAULTS };
    return { ...DEFAULTS };
  }
}

export async function saveDownloadPreferences(
  patch: Partial<DownloadPreferences>,
): Promise<DownloadPreferences> {
  const current = memoryCache ?? (await loadDownloadPreferences());
  const next = { ...current, ...patch };
  memoryCache = next;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return { ...next };
}
