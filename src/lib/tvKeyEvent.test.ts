import { describe, expect, it } from 'vitest';

import { tvKeyboardKeyToEventType, tvKeyNativeEventToHw } from './tvKeyEvent';

describe('tvKeyboardKeyToEventType', () => {
  it('maps arrow keys', () => {
    expect(tvKeyboardKeyToEventType('ArrowDown')).toBe('down');
    expect(tvKeyboardKeyToEventType('ArrowUp')).toBe('up');
    expect(tvKeyboardKeyToEventType('ArrowLeft')).toBe('left');
    expect(tvKeyboardKeyToEventType('ArrowRight')).toBe('right');
  });

  it('maps Android DPAD tokens on code', () => {
    expect(tvKeyboardKeyToEventType('Unidentified', 'DPAD_DOWN')).toBe('down');
    expect(tvKeyboardKeyToEventType('', 'ArrowLeft')).toBe('left');
  });

  it('maps OK / back', () => {
    expect(tvKeyboardKeyToEventType('Enter')).toBe('select');
    expect(tvKeyboardKeyToEventType('Select')).toBe('select');
    expect(tvKeyboardKeyToEventType('Escape')).toBe('back');
    expect(tvKeyboardKeyToEventType('MediaPlayPause')).toBe('playPause');
  });

  it('builds a HW event', () => {
    expect(tvKeyNativeEventToHw({ key: 'ArrowDown' }, 1)).toEqual({
      eventType: 'down',
      eventKeyAction: 1,
    });
    expect(tvKeyNativeEventToHw({ key: 'f' }, 1)).toBeNull();
  });

  it('maps Android keyCode when key/code are empty', () => {
    expect(tvKeyNativeEventToHw({ keyCode: 20 }, 0)).toEqual({
      eventType: 'down',
      eventKeyAction: 0,
    });
    expect(tvKeyNativeEventToHw({ keyCode: 23 }, 1)).toEqual({
      eventType: 'select',
      eventKeyAction: 1,
    });
    expect(tvKeyNativeEventToHw({ keyCode: 4 }, 1)).toEqual({
      eventType: 'back',
      eventKeyAction: 1,
    });
  });

  it('accepts already-mapped HW eventType', () => {
    expect(tvKeyNativeEventToHw({ eventType: 'left' }, 1)).toEqual({
      eventType: 'left',
      eventKeyAction: 1,
    });
  });
});
