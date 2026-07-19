import AsyncStorage from '@react-native-async-storage/async-storage';

/** Matches iOS `LastSelection` stored under `lastSelection_{mediaId}`. */
export interface LampaLastSelection {
  /** Source label / id previously chosen by the user. */
  sourceId: string;
  seasonNumber: number;
  /** Translator / dub name previously chosen by the user. */
  dubId: string;
}

function storageKey(mediaId: string): string {
  return `lastSelection_${mediaId}`;
}

export async function loadLampaLastSelection(
  mediaId: string,
): Promise<LampaLastSelection | null> {
  const id = mediaId.trim();
  if (!id) return null;
  try {
    const raw = await AsyncStorage.getItem(storageKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LampaLastSelection>;
    if (
      typeof parsed.sourceId !== 'string' ||
      !parsed.sourceId.trim() ||
      typeof parsed.dubId !== 'string' ||
      !parsed.dubId.trim()
    ) {
      return null;
    }
    const seasonNumber =
      typeof parsed.seasonNumber === 'number' && Number.isFinite(parsed.seasonNumber)
        ? Math.max(1, Math.floor(parsed.seasonNumber))
        : 1;
    return {
      sourceId: parsed.sourceId.trim(),
      seasonNumber,
      dubId: parsed.dubId.trim(),
    };
  } catch {
    return null;
  }
}

export async function saveLampaLastSelection(
  mediaId: string,
  selection: LampaLastSelection,
): Promise<void> {
  const id = mediaId.trim();
  if (!id) return;
  const payload: LampaLastSelection = {
    sourceId: selection.sourceId.trim(),
    seasonNumber: Math.max(1, Math.floor(selection.seasonNumber || 1)),
    dubId: selection.dubId.trim(),
  };
  if (!payload.sourceId || !payload.dubId) return;
  try {
    await AsyncStorage.setItem(storageKey(id), JSON.stringify(payload));
  } catch {
    /* ignore persist errors */
  }
}
