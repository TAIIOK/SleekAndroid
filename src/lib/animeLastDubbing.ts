import AsyncStorage from '@react-native-async-storage/async-storage';

/** Client-persisted last catalog anime voiceover, keyed by anime id. */

function storageKey(animeId: number): string {
  return `animeLastDubbing_${animeId}`;
}

export async function loadAnimeLastDubbing(animeId: number): Promise<string | null> {
  if (!Number.isFinite(animeId) || animeId <= 0) return null;
  try {
    const raw = await AsyncStorage.getItem(storageKey(animeId));
    if (!raw) return null;
    const value = raw.trim();
    return value || null;
  } catch {
    return null;
  }
}

export async function saveAnimeLastDubbing(animeId: number, dubbing: string): Promise<void> {
  if (!Number.isFinite(animeId) || animeId <= 0) return;
  const value = dubbing.trim();
  if (!value) return;
  try {
    await AsyncStorage.setItem(storageKey(animeId), value);
  } catch {
    /* ignore persist errors */
  }
}
