import AsyncStorage from '@react-native-async-storage/async-storage';

export const SEARCH_HISTORY_KEY = 'aniverse-search-history';
export const MAX_SEARCH_HISTORY = 10;

function normalizeQuery(q: string): string {
  return q.trim().replace(/\s+/g, ' ');
}

async function readRaw(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === 'string')
      .map(normalizeQuery)
      .filter((item) => item.length >= 2);
  } catch {
    return [];
  }
}

async function writeRaw(queries: string[]): Promise<void> {
  await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(queries));
}

export async function getSearchHistory(): Promise<string[]> {
  return readRaw();
}

/** Prepend query (case-insensitive dedupe), keep most recent first. */
export async function addSearchHistory(query: string): Promise<string[]> {
  const normalized = normalizeQuery(query);
  if (normalized.length < 2) return readRaw();

  const existing = await readRaw();
  const lower = normalized.toLowerCase();
  const without = existing.filter((item) => item.toLowerCase() !== lower);
  const next = [normalized, ...without].slice(0, MAX_SEARCH_HISTORY);
  await writeRaw(next);
  return next;
}

export async function clearSearchHistory(): Promise<void> {
  await writeRaw([]);
}

export async function removeSearchHistory(query: string): Promise<string[]> {
  const lower = normalizeQuery(query).toLowerCase();
  const next = (await readRaw()).filter((item) => item.toLowerCase() !== lower);
  await writeRaw(next);
  return next;
}
