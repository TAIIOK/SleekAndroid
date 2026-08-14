import { describe, expect, it } from 'vitest';

import { isTvPlayerActivationKeyUp, mapHiddenHudKey } from './tvPlayerRemote';

const center = { hasSkipPrompt: false, centerFocus: 'play' as const };

describe('mapHiddenHudKey', () => {
  it('shows the timeline and seeks on left/right', () => {
    expect(mapHiddenHudKey('left', center)).toEqual({ kind: 'seekBack', focus: 'timeline' });
    expect(mapHiddenHudKey('right', center)).toEqual({ kind: 'seekForward', focus: 'timeline' });
  });

  it('shows the HUD on up/down', () => {
    expect(mapHiddenHudKey('up', center)).toEqual({ kind: 'show', focus: 'timeline' });
    expect(mapHiddenHudKey('down', center)).toEqual({ kind: 'show', focus: 'play' });
  });

  it('toggles play and shows the center dock on OK', () => {
    expect(mapHiddenHudKey('select', center)).toEqual({ kind: 'togglePlay', focus: 'play' });
    expect(mapHiddenHudKey('playPause', center)).toEqual({ kind: 'togglePlay', focus: 'play' });
  });

  it('applies skip instead of play when the skip CTA is visible', () => {
    expect(mapHiddenHudKey('select', { hasSkipPrompt: true, centerFocus: 'play' })).toEqual({
      kind: 'skip',
    });
  });

  it('exits on back', () => {
    expect(mapHiddenHudKey('back', center)).toEqual({ kind: 'back' });
  });
});

describe('isTvPlayerActivationKeyUp', () => {
  it('ignores OK / playPause key-up so a held remote does not toggle twice', () => {
    expect(isTvPlayerActivationKeyUp({ eventType: 'select', eventKeyAction: 1 })).toBe(true);
    expect(isTvPlayerActivationKeyUp({ eventType: 'playPause', eventKeyAction: 1 })).toBe(true);
  });

  it('still handles key-down and D-pad', () => {
    expect(isTvPlayerActivationKeyUp({ eventType: 'select', eventKeyAction: 0 })).toBe(false);
    expect(isTvPlayerActivationKeyUp({ eventType: 'select' })).toBe(false);
    expect(isTvPlayerActivationKeyUp({ eventType: 'down', eventKeyAction: 1 })).toBe(false);
  });
});
