import { describe, expect, it } from 'vitest';

import {
  DEFAULT_HOME_QUICK_ACTION_IDS,
  moveHomeQuickAction,
  normalizeHomeQuickActionIds,
  resolveHomeQuickActions,
  toggleHomeQuickAction,
} from './homeQuickActions';

describe('normalizeHomeQuickActionIds', () => {
  it('falls back to phone defaults when the payload is missing', () => {
    expect(normalizeHomeQuickActionIds(null)).toEqual(DEFAULT_HOME_QUICK_ACTION_IDS);
    expect(normalizeHomeQuickActionIds(undefined)).toEqual(DEFAULT_HOME_QUICK_ACTION_IDS);
    expect(normalizeHomeQuickActionIds('bookmarks')).toEqual(DEFAULT_HOME_QUICK_ACTION_IDS);
  });

  it('keeps an explicit empty list so the TV rail can be hidden', () => {
    expect(normalizeHomeQuickActionIds([])).toEqual([]);
  });

  it('drops unknown ids and duplicates while preserving order', () => {
    expect(
      normalizeHomeQuickActionIds(['history', 'nope', 'history', 'search', 12, 'anime']),
    ).toEqual(['history', 'search', 'anime']);
  });
});

describe('toggleHomeQuickAction', () => {
  it('appends an enabled extra and removes a disabled one', () => {
    expect(toggleHomeQuickAction(['bookmarks', 'lists'], 'search', true)).toEqual([
      'bookmarks',
      'lists',
      'search',
    ]);
    expect(toggleHomeQuickAction(['bookmarks', 'lists', 'search'], 'lists', false)).toEqual([
      'bookmarks',
      'search',
    ]);
  });
});

describe('moveHomeQuickAction', () => {
  it('swaps neighbors and ignores edges', () => {
    expect(moveHomeQuickAction(['bookmarks', 'lists', 'history'], 'lists', -1)).toEqual([
      'lists',
      'bookmarks',
      'history',
    ]);
    expect(moveHomeQuickAction(['bookmarks', 'lists', 'history'], 'history', 1)).toEqual([
      'bookmarks',
      'lists',
      'history',
    ]);
  });
});

describe('resolveHomeQuickActions', () => {
  it('maps ids to catalog defs in the saved order', () => {
    expect(resolveHomeQuickActions(['history', 'search']).map((action) => action.href)).toEqual([
      '/history',
      '/search',
    ]);
  });
});
