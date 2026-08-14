import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'aniverse_active_party_room';

let memoryId: string | null | undefined;

export async function getActivePartyRoomId(): Promise<string | null> {
  if (memoryId !== undefined) return memoryId;
  try {
    memoryId = await AsyncStorage.getItem(KEY);
  } catch {
    memoryId = null;
  }
  return memoryId;
}

export function getActivePartyRoomIdSync(): string | null {
  return memoryId ?? null;
}

export async function setActivePartyRoomId(roomId: string): Promise<void> {
  memoryId = roomId;
  try {
    await AsyncStorage.setItem(KEY, roomId);
  } catch {
    // ignore
  }
}

export async function clearActivePartyRoomId(): Promise<void> {
  memoryId = null;
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
