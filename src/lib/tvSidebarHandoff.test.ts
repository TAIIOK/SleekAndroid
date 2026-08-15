import { describe, expect, it } from 'vitest';

import {
  shouldCloseMenuOnContentFocus,
  shouldKeepClosedMenuSidebarAnchor,
  shouldKeepRowExitFocusable,
  shouldParkSidebarOnRouteChange,
  topLevelNavKey,
} from './tvSidebarHandoff';

describe('topLevelNavKey', () => {
  it('maps home and empty paths to /', () => {
    expect(topLevelNavKey('/')).toBe('/');
    expect(topLevelNavKey('')).toBe('/');
  });

  it('uses the first segment for catalog hubs', () => {
    expect(topLevelNavKey('/movies')).toBe('/movies');
    expect(topLevelNavKey('/movies/550')).toBe('/movies');
    expect(topLevelNavKey('/series/1396')).toBe('/series');
    expect(topLevelNavKey('/anime/12')).toBe('/anime');
  });

  it('collapses library, friends, and account routes onto their sidebar entries', () => {
    expect(topLevelNavKey('/library/bookmarks')).toBe('/library/lists');
    expect(topLevelNavKey('/friends/requests')).toBe('/friends/feed');
    expect(topLevelNavKey('/users/abc')).toBe('/friends/feed');
    expect(topLevelNavKey('/accounts')).toBe('/profile');
    expect(topLevelNavKey('/settings')).toBe('/profile');
  });
});

describe('shouldParkSidebarOnRouteChange', () => {
  it('parks when switching top-level hubs', () => {
    expect(shouldParkSidebarOnRouteChange('/', '/movies')).toBe(true);
    expect(shouldParkSidebarOnRouteChange('/anime', '/series')).toBe(true);
    expect(shouldParkSidebarOnRouteChange('/movies/550', '/anime')).toBe(true);
  });

  it('does not park on detail push or back within the same hub', () => {
    expect(shouldParkSidebarOnRouteChange('/movies', '/movies/550')).toBe(false);
    expect(shouldParkSidebarOnRouteChange('/movies/550', '/movies')).toBe(false);
    expect(shouldParkSidebarOnRouteChange('/anime', '/anime/12')).toBe(false);
    expect(shouldParkSidebarOnRouteChange('/series/1396', '/series')).toBe(false);
    expect(shouldParkSidebarOnRouteChange('/friends/feed', '/users/abc')).toBe(false);
    expect(shouldParkSidebarOnRouteChange('/friends/list', '/users/abc')).toBe(false);
    expect(shouldParkSidebarOnRouteChange('/users/abc', '/friends/feed')).toBe(false);
  });

  it('does not park when the path is unchanged', () => {
    expect(shouldParkSidebarOnRouteChange('/movies', '/movies')).toBe(false);
  });
});

describe('shouldKeepClosedMenuSidebarAnchor', () => {
  it('keeps the closed-menu fallback on catalog hubs', () => {
    expect(shouldKeepClosedMenuSidebarAnchor('/')).toBe(true);
    expect(shouldKeepClosedMenuSidebarAnchor('/movies')).toBe(true);
    expect(shouldKeepClosedMenuSidebarAnchor('/anime')).toBe(true);
  });

  it('drops the fallback on title detail routes', () => {
    expect(shouldKeepClosedMenuSidebarAnchor('/movies/550')).toBe(false);
    expect(shouldKeepClosedMenuSidebarAnchor('/series/1396')).toBe(false);
    expect(shouldKeepClosedMenuSidebarAnchor('/anime/12')).toBe(false);
    expect(shouldKeepClosedMenuSidebarAnchor('/person/31')).toBe(false);
  });

  it('drops the fallback on fullscreen party rooms and watch', () => {
    expect(shouldKeepClosedMenuSidebarAnchor('/party/abc')).toBe(false);
    expect(shouldKeepClosedMenuSidebarAnchor('/party/invite/tok')).toBe(false);
    expect(shouldKeepClosedMenuSidebarAnchor('/watch/party/abc')).toBe(false);
  });

  it('keeps the fallback on the party lobby', () => {
    expect(shouldKeepClosedMenuSidebarAnchor('/party')).toBe(true);
  });
});

describe('shouldKeepRowExitFocusable', () => {
  it('stays focusable while the menu is closed', () => {
    expect(shouldKeepRowExitFocusable({ menuOpen: false, sidebarFocused: false })).toBe(true);
  });

  it('stays focusable after menuOpen until a sidebar row owns focus', () => {
    expect(shouldKeepRowExitFocusable({ menuOpen: true, sidebarFocused: false })).toBe(true);
  });

  it('drops the hop once the sidebar owns focus', () => {
    expect(shouldKeepRowExitFocusable({ menuOpen: true, sidebarFocused: true })).toBe(false);
  });
});

describe('shouldCloseMenuOnContentFocus', () => {
  it('closes the overlay when content takes focus', () => {
    expect(shouldCloseMenuOnContentFocus(true)).toBe(true);
  });

  it('does not close when the overlay is already hidden', () => {
    expect(shouldCloseMenuOnContentFocus(false)).toBe(false);
  });
});
