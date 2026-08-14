import type { TvPlayerPanelFocus } from '@/components/player/tv/tvPlayerTypes';

/**
 * Android TV OK fires key-down, key-up, and often Pressable `onPress`.
 * Acting on key-up toggles play twice: local play starts, then a pause is
 * broadcast and everyone else stays paused.
 */
export function isTvPlayerActivationKeyUp(event: {
  eventType: string;
  eventKeyAction?: number;
}): boolean {
  if (event.eventKeyAction !== 1) return false;
  return event.eventType === 'select' || event.eventType === 'playPause';
}

export type HiddenHudCommand =
  | { kind: 'back' }
  | { kind: 'skip' }
  | { kind: 'togglePlay'; focus: TvPlayerPanelFocus }
  | { kind: 'seekBack'; focus: 'timeline' }
  | { kind: 'seekForward'; focus: 'timeline' }
  | { kind: 'show'; focus: TvPlayerPanelFocus }
  | null;

/**
 * Hidden-chrome D-pad: every transport/OK key reveals the HUD.
 * ←/→ still seek; OK toggles play (or skip CTA); Back exits.
 */
export function mapHiddenHudKey(
  eventType: string,
  opts: { hasSkipPrompt: boolean; centerFocus: TvPlayerPanelFocus },
): HiddenHudCommand {
  if (eventType === 'menu' || eventType === 'back') return { kind: 'back' };
  if (eventType === 'select' || eventType === 'playPause') {
    if (opts.hasSkipPrompt) return { kind: 'skip' };
    return { kind: 'togglePlay', focus: opts.centerFocus };
  }
  if (eventType === 'left') return { kind: 'seekBack', focus: 'timeline' };
  if (eventType === 'right') return { kind: 'seekForward', focus: 'timeline' };
  if (eventType === 'up') return { kind: 'show', focus: 'timeline' };
  if (eventType === 'down') return { kind: 'show', focus: opts.centerFocus };
  return null;
}
