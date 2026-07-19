import AsyncStorage from '@react-native-async-storage/async-storage';

export type VideoFitMode = 'contain' | 'cover' | 'fill';

export interface PlayerPreferences {
  autoPlayNext: boolean;
  autoSkipOpening: boolean;
  autoSkipEnding: boolean;
  skipBackwardSeconds: number;
  skipForwardSeconds: number;
  playbackRate: number;
  videoFit: VideoFitMode;
  gestureControlsEnabled: boolean;
  gesturesLocked: boolean;
  /** Preferred subtitle language code (e.g. `ru`, `en`); empty = off by default. */
  preferredSubtitleLanguage: string;
  /** Last Android package used for external playback (empty = system chooser). */
  lastExternalPlayerPackage: string;
}

const STORAGE_KEY = 'aniverse-player-prefs';

export const PLAYBACK_RATES = [0.5, 1, 1.25, 1.5, 2] as const;

export const SKIP_SECOND_CHOICES = [5, 10, 15, 30, 45, 60, 90, 120] as const;

const DEFAULTS: PlayerPreferences = {
  autoPlayNext: true,
  autoSkipOpening: false,
  autoSkipEnding: false,
  skipBackwardSeconds: 15,
  skipForwardSeconds: 30,
  playbackRate: 1,
  videoFit: 'contain',
  gestureControlsEnabled: true,
  gesturesLocked: false,
  preferredSubtitleLanguage: '',
  lastExternalPlayerPackage: '',
};

let memoryCache: PlayerPreferences | null = null;

function normalizePrefs(parsed: Partial<PlayerPreferences>): PlayerPreferences {
  return {
    ...DEFAULTS,
    ...parsed,
    skipBackwardSeconds: SKIP_SECOND_CHOICES.includes(
      parsed.skipBackwardSeconds as (typeof SKIP_SECOND_CHOICES)[number],
    )
      ? parsed.skipBackwardSeconds!
      : DEFAULTS.skipBackwardSeconds,
    skipForwardSeconds: SKIP_SECOND_CHOICES.includes(
      parsed.skipForwardSeconds as (typeof SKIP_SECOND_CHOICES)[number],
    )
      ? parsed.skipForwardSeconds!
      : DEFAULTS.skipForwardSeconds,
    playbackRate: PLAYBACK_RATES.includes(parsed.playbackRate as (typeof PLAYBACK_RATES)[number])
      ? parsed.playbackRate!
      : DEFAULTS.playbackRate,
    videoFit:
      parsed.videoFit === 'contain' || parsed.videoFit === 'cover' || parsed.videoFit === 'fill'
        ? parsed.videoFit
        : DEFAULTS.videoFit,
    gesturesLocked: Boolean(parsed.gesturesLocked),
    preferredSubtitleLanguage:
      typeof parsed.preferredSubtitleLanguage === 'string'
        ? parsed.preferredSubtitleLanguage
        : DEFAULTS.preferredSubtitleLanguage,
    lastExternalPlayerPackage:
      typeof parsed.lastExternalPlayerPackage === 'string'
        ? parsed.lastExternalPlayerPackage
        : DEFAULTS.lastExternalPlayerPackage,
  };
}

export function getPlayerPreferencesSync(): PlayerPreferences {
  return memoryCache ? { ...memoryCache } : { ...DEFAULTS };
}

export async function loadPlayerPreferences(): Promise<PlayerPreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      memoryCache = { ...DEFAULTS };
      return { ...DEFAULTS };
    }
    const parsed = JSON.parse(raw) as Partial<PlayerPreferences>;
    memoryCache = normalizePrefs(parsed);
    return { ...memoryCache };
  } catch {
    memoryCache = { ...DEFAULTS };
    return { ...DEFAULTS };
  }
}

export async function savePlayerPreferences(
  patch: Partial<PlayerPreferences>,
): Promise<PlayerPreferences> {
  const current = memoryCache ?? (await loadPlayerPreferences());
  const next = normalizePrefs({ ...current, ...patch });
  memoryCache = next;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return { ...next };
}

export function cyclePlaybackRate(current: number): number {
  const idx = PLAYBACK_RATES.findIndex((r) => Math.abs(r - current) < 0.01);
  const next = idx >= 0 ? (idx + 1) % PLAYBACK_RATES.length : 1;
  return PLAYBACK_RATES[next];
}

export function cycleVideoFit(current: VideoFitMode): VideoFitMode {
  if (current === 'contain') return 'cover';
  if (current === 'cover') return 'fill';
  return 'contain';
}

export function formatPlaybackRate(rate: number): string {
  if (Math.abs(rate - 1) < 0.01) return '1×';
  return `${rate}×`;
}

export function videoFitLabel(fit: VideoFitMode): string {
  if (fit === 'cover') return 'Обрезка';
  if (fit === 'fill') return 'Растянуть';
  return 'Вписать';
}
