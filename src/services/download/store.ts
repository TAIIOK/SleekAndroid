import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DownloadRecord } from './types';

const STORAGE_KEY = 'aniverse_native_downloads_v1';

export async function loadDownloadRecords(): Promise<DownloadRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as DownloadRecord[]) : [];
  } catch {
    return [];
  }
}

export async function saveDownloadRecords(records: DownloadRecord[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}
