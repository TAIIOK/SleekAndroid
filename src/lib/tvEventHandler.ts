import * as ReactNative from 'react-native';

export type TvHwEvent = {
  eventType: string;
  eventKeyAction?: number;
};

type TvEventHandlerHook = (handler: (event: TvHwEvent) => void) => void;

const nativeHook = (ReactNative as { useTVEventHandler?: TvEventHandlerHook }).useTVEventHandler;

/** Safe TV remote hook — no-ops when `react-native-tvos` APIs are missing from the bundle. */
export const useTvEventHandlerSafe: TvEventHandlerHook =
  typeof nativeHook === 'function' ? nativeHook : () => {};
