import type { TvHwEvent } from '@/lib/tvEventHandler';

function norm(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** Android KeyEvent codes used by TV remotes. */
const ANDROID_KEYCODE: Record<number, string> = {
  19: 'up',
  20: 'down',
  21: 'left',
  22: 'right',
  23: 'select',
  66: 'select',
  62: 'select',
  4: 'back',
  82: 'menu',
  85: 'playPause',
  126: 'playPause',
  127: 'playPause',
};

/**
 * react-native-tvos 0.85 dropped `useTVEventHandler`. D-pad arrives as
 * View `onKeyDown` / `onKeyUp` KeyboardEvents on the focused view.
 */
export function tvKeyboardKeyToEventType(key: string, code?: string): string | null {
  const tokens = [norm(key), norm(code ?? '')].filter(Boolean);
  for (const token of tokens) {
    if (token === 'arrowup' || token === 'dpadup' || token === 'up' || token === 'keycodedpadup') {
      return 'up';
    }
    if (
      token === 'arrowdown' ||
      token === 'dpaddown' ||
      token === 'down' ||
      token === 'keycodedpaddown'
    ) {
      return 'down';
    }
    if (
      token === 'arrowleft' ||
      token === 'dpadleft' ||
      token === 'left' ||
      token === 'keycodedpadleft'
    ) {
      return 'left';
    }
    if (
      token === 'arrowright' ||
      token === 'dpadright' ||
      token === 'right' ||
      token === 'keycodedpadright'
    ) {
      return 'right';
    }
    if (
      token === 'enter' ||
      token === 'select' ||
      token === 'space' ||
      token === 'spacebar' ||
      token === 'numpadenter' ||
      token === 'dpadcenter' ||
      token === 'keycodedpadcenter' ||
      token === 'keycodeenter'
    ) {
      return 'select';
    }
    if (token === 'mediaplaypause' || token === 'mediaplay' || token === 'mediapause') {
      return 'playPause';
    }
    if (token === 'escape' || token === 'back' || token === 'browserback' || token === 'keycodeback') {
      return 'back';
    }
    if (token === 'contextmenu' || token === 'menu' || token === 'keycodemenu') return 'menu';
  }
  return null;
}

export type TvKeyNative = {
  key?: string;
  code?: string;
  keyCode?: number;
  which?: number;
  pressedKey?: string;
  eventType?: string;
};

export function tvKeyNativeEventToHw(native: TvKeyNative, action: 0 | 1): TvHwEvent | null {
  const hwType = native.eventType;
  if (
    hwType &&
    hwType !== 'focus' &&
    hwType !== 'blur' &&
    (hwType === 'up' ||
      hwType === 'down' ||
      hwType === 'left' ||
      hwType === 'right' ||
      hwType === 'select' ||
      hwType === 'playPause' ||
      hwType === 'back' ||
      hwType === 'menu')
  ) {
    return { eventType: hwType, eventKeyAction: action };
  }

  const fromKey = tvKeyboardKeyToEventType(
    native.key ?? native.pressedKey ?? '',
    native.code,
  );
  if (fromKey) return { eventType: fromKey, eventKeyAction: action };

  const code = native.keyCode ?? native.which;
  if (code != null && ANDROID_KEYCODE[code]) {
    return { eventType: ANDROID_KEYCODE[code], eventKeyAction: action };
  }
  return null;
}
