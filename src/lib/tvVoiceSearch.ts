import { Platform } from 'react-native';

type IntentLauncherModule = typeof import('expo-intent-launcher');

let cachedIntentLauncher: IntentLauncherModule | null | undefined;

function getIntentLauncher(): IntentLauncherModule | null {
  if (cachedIntentLauncher !== undefined) return cachedIntentLauncher;
  try {
    // String literal required so Metro includes the module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedIntentLauncher = require('expo-intent-launcher') as IntentLauncherModule;
  } catch {
    cachedIntentLauncher = null;
  }
  return cachedIntentLauncher;
}

const RESULTS_KEY = 'android.speech.extra.RESULTS';
/** Android Activity.RESULT_OK — expo-intent-launcher ResultCode.Success. */
const RESULT_OK = -1;

export const VOICE_SEARCH_UNAVAILABLE = 'Голосовой поиск недоступен на этом устройстве';

export type TvVoiceSearchResult =
  | { status: 'success'; query: string }
  | { status: 'cancelled' }
  | { status: 'unavailable'; message: string };

/** First spoken query from RecognizerIntent extras (array, string, or numeric-key map). */
export function parseSpeechRecognitionResults(extra: unknown): string | null {
  if (extra == null || typeof extra !== 'object') return null;
  const record = extra as Record<string, unknown>;
  return firstSpokenQuery(record[RESULTS_KEY] ?? record.RESULTS);
}

function firstSpokenQuery(raw: unknown): string | null {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('[')) {
      try {
        return firstSpokenQuery(JSON.parse(trimmed) as unknown);
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === 'string' && item.trim()) return item.trim();
    }
    return null;
  }
  if (raw && typeof raw === 'object') {
    for (const item of Object.values(raw as Record<string, unknown>)) {
      if (typeof item === 'string' && item.trim()) return item.trim();
    }
  }
  return null;
}

export async function launchTvVoiceSearch(): Promise<TvVoiceSearchResult> {
  if (Platform.OS !== 'android') {
    return { status: 'unavailable', message: VOICE_SEARCH_UNAVAILABLE };
  }

  const IntentLauncher = getIntentLauncher();
  if (!IntentLauncher) {
    return { status: 'unavailable', message: VOICE_SEARCH_UNAVAILABLE };
  }

  try {
    const result = await IntentLauncher.startActivityAsync('android.speech.action.RECOGNIZE_SPEECH', {
      extra: {
        'android.speech.extra.LANGUAGE_MODEL': 'free_form',
        'android.speech.extra.LANGUAGE': 'ru-RU',
        'android.speech.extra.PROMPT': 'Название аниме, фильма или сериала',
        'android.speech.extra.MAX_RESULTS': 1,
      },
    });
    if (result.resultCode !== RESULT_OK) {
      return { status: 'cancelled' };
    }
    const query = parseSpeechRecognitionResults(result.extra);
    if (!query) return { status: 'cancelled' };
    return { status: 'success', query };
  } catch {
    return { status: 'unavailable', message: VOICE_SEARCH_UNAVAILABLE };
  }
}
