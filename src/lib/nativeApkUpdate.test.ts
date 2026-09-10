import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Linking: { canOpenURL: vi.fn(), openURL: vi.fn() },
  Platform: { OS: 'android' },
}));

vi.mock('expo-constants', () => ({
  default: {
    nativeBuildVersion: '10',
    nativeApplicationVersion: '1.0.10',
    expoConfig: {
      version: '1.0.10',
      android: { versionCode: 10, package: 'ru.taiiok.aniverse.app' },
      extra: { releasesUrl: 'https://sleekapp.ru/releases/latest.json' },
    },
  },
}));

vi.mock('@/lib/isTvUi', () => ({
  isTvUi: vi.fn(() => false),
}));

vi.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  getInfoAsync: vi.fn(),
  makeDirectoryAsync: vi.fn(),
  deleteAsync: vi.fn(),
  createDownloadResumable: vi.fn(),
  getContentUriAsync: vi.fn(),
}));

import { isTvUi } from '@/lib/isTvUi';

import {
  apkCacheFileName,
  buildApkInstallIntent,
  buildUnknownSourcesIntent,
  checkBinaryUpdate,
  compareVersionNames,
  FLAG_ACTIVITY_NEW_TASK,
  FLAG_GRANT_READ_URI_PERMISSION,
  formatBytes,
  formatDownloadProgress,
  isBinaryUpdateAvailable,
  isInstallPermissionError,
  pickApkDownloadUrl,
  presentApkUpdatePrompt,
  subscribeApkUpdatePrompt,
  type AppReleaseManifest,
} from './nativeApkUpdate';

const newer: AppReleaseManifest = {
  versionName: '1.0.18',
  versionCode: 18,
  phoneApkUrl: 'https://sleekapp.ru/releases/sleek.apk',
  tvApkUrl: 'https://sleekapp.ru/releases/sleek-tv.apk',
};

describe('compareVersionNames', () => {
  it('detects a newer dotted version', () => {
    expect(compareVersionNames('1.0.18', '1.0.10')).toBe(1);
    expect(compareVersionNames('1.0.10', '1.0.18')).toBe(-1);
    expect(compareVersionNames('1.0.10', '1.0.10')).toBe(0);
  });
});

describe('isBinaryUpdateAvailable', () => {
  it('requires both a newer version name and a higher versionCode', () => {
    expect(isBinaryUpdateAvailable(newer)).toBe(true);
    expect(
      isBinaryUpdateAvailable({
        ...newer,
        versionName: '1.0.10',
        versionCode: 99,
      }),
    ).toBe(false);
    expect(
      isBinaryUpdateAvailable({
        ...newer,
        versionName: '1.0.18',
        versionCode: 10,
      }),
    ).toBe(false);
  });
});

describe('pickApkDownloadUrl', () => {
  it('prefers the phone APK on phone UI', () => {
    vi.mocked(isTvUi).mockReturnValue(false);
    expect(pickApkDownloadUrl(newer)).toBe(newer.phoneApkUrl);
  });

  it('prefers the TV APK on TV UI', () => {
    vi.mocked(isTvUi).mockReturnValue(true);
    expect(pickApkDownloadUrl(newer)).toBe(newer.tvApkUrl);
  });
});

describe('apk install helpers', () => {
  it('builds a content-URI install intent with read + new-task flags', () => {
    const params = buildApkInstallIntent('content://expo/updates/sleek-18.apk');
    expect(params.data).toBe('content://expo/updates/sleek-18.apk');
    expect(params.type).toBe('application/vnd.android.package-archive');
    expect(params.flags & FLAG_GRANT_READ_URI_PERMISSION).toBe(FLAG_GRANT_READ_URI_PERMISSION);
    expect(params.flags & FLAG_ACTIVITY_NEW_TASK).toBe(FLAG_ACTIVITY_NEW_TASK);
  });

  it('opens unknown-sources settings for this package', () => {
    expect(buildUnknownSourcesIntent('ru.taiiok.aniverse.tv')).toEqual({
      data: 'package:ru.taiiok.aniverse.tv',
    });
  });

  it('names the cached APK by versionCode', () => {
    expect(apkCacheFileName(18)).toBe('sleek-18.apk');
  });

  it('formats download progress', () => {
    const progress = formatDownloadProgress(21 * 1024 * 1024, 50 * 1024 * 1024);
    expect(progress.percentLabel).toBe('42%');
    expect(progress.bytesLabel).toContain('МБ');
    expect(formatBytes(512)).toBe('512 Б');
  });

  it('detects unknown-sources install errors', () => {
    expect(isInstallPermissionError(new Error('Permission Denial: REQUEST_INSTALL_PACKAGES'))).toBe(
      true,
    );
    expect(isInstallPermissionError(new Error('network timeout'))).toBe(false);
  });
});

describe('checkBinaryUpdate', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns available for a newer manifest with an APK URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => newer,
      })),
    );
    vi.mocked(isTvUi).mockReturnValue(false);
    await expect(checkBinaryUpdate()).resolves.toEqual({
      status: 'available',
      manifest: expect.objectContaining({ versionName: '1.0.18', phoneApkUrl: newer.phoneApkUrl }),
    });
  });

  it('returns up_to_date when remote version is not newer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ ...newer, versionName: '1.0.10', versionCode: 10 }),
      })),
    );
    await expect(checkBinaryUpdate()).resolves.toEqual({ status: 'up_to_date' });
  });
});

describe('presentApkUpdatePrompt', () => {
  it('notifies subscribers so Settings can open the same prompt', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeApkUpdatePrompt(listener);
    presentApkUpdatePrompt(newer);
    expect(listener).toHaveBeenCalledWith(newer);
    unsubscribe();
    presentApkUpdatePrompt(newer);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
