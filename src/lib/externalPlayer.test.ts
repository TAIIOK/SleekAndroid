import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Linking: { canOpenURL: vi.fn(), openURL: vi.fn() },
  Platform: { OS: 'android' },
}));

vi.mock('expo-intent-launcher', () => ({}));

vi.mock('@/lib/playerPreferences', () => ({
  getPlayerPreferencesSync: () => ({ lastExternalPlayerPackage: '' }),
  savePlayerPreferences: vi.fn(),
}));

import { extrasForPackage } from './externalPlayer';

describe('extrasForPackage', () => {
  it('passes ms position for Just Player', () => {
    const extras = extrasForPackage('com.brouken.player', 'Title', 125_000);
    expect(extras.position).toBe(125_000);
  });

  it('passes ms position for VLC', () => {
    const extras = extrasForPackage('org.videolan.vlc', 'Title', 90_000);
    expect(extras.position).toBe(90_000);
    expect(extras.from_start).toBe(false);
  });

  it('passes ms position for mpv', () => {
    const extras = extrasForPackage('is.xyz.mpv', 'Title', 10_000);
    expect(extras.position).toBe(10_000);
  });
});
