import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-router', () => ({
  router: {
    canDismiss: () => false,
    dismiss: () => undefined,
    dismissTo: () => undefined,
  },
}));

import {
  defaultDetailReturnPath,
  peekDetailReturnPath,
  setDetailReturnPath,
} from './detailNavigation';

describe('defaultDetailReturnPath', () => {
  it('returns the matching catalog hub for a title detail', () => {
    expect(defaultDetailReturnPath('/anime/12')).toBe('/anime');
    expect(defaultDetailReturnPath('/movies/550')).toBe('/movies');
    expect(defaultDetailReturnPath('/series/1396')).toBe('/series');
  });

  it('returns movies hub for person detail', () => {
    expect(defaultDetailReturnPath('/person/31')).toBe('/movies');
  });

  it('returns home for unknown paths', () => {
    expect(defaultDetailReturnPath('/search')).toBe('/');
  });
});

describe('setDetailReturnPath', () => {
  afterEach(() => {
    setDetailReturnPath('');
  });

  it('stores a non-empty origin path', () => {
    setDetailReturnPath('/');
    expect(peekDetailReturnPath()).toBe('/');
    setDetailReturnPath('/search');
    expect(peekDetailReturnPath()).toBe('/search');
  });
});
