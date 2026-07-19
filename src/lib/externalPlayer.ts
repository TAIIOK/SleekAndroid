import * as IntentLauncher from 'expo-intent-launcher';
import { Linking, Platform } from 'react-native';

import {
  getPlayerPreferencesSync,
  savePlayerPreferences,
} from '@/lib/playerPreferences';

export type ExternalPlayerId = 'just' | 'vlc' | 'mpv' | 'system';

export interface ExternalPlayerTarget {
  id: ExternalPlayerId;
  label: string;
  packageName?: string;
}

export interface ExternalPlayerLaunchOptions {
  url: string;
  title?: string;
  /** Resume position in seconds. */
  positionSeconds?: number;
  /** Prefer this package; falls back to system chooser. */
  packageName?: string | null;
}

const KNOWN_PLAYERS: ExternalPlayerTarget[] = [
  { id: 'just', label: 'Just Player', packageName: 'com.brouken.player' },
  { id: 'vlc', label: 'VLC', packageName: 'org.videolan.vlc' },
  { id: 'mpv', label: 'mpv', packageName: 'is.xyz.mpv' },
];

export const SYSTEM_PLAYER_TARGET: ExternalPlayerTarget = {
  id: 'system',
  label: 'Системный выбор…',
};

async function isPackageInstalled(packageName: string): Promise<boolean> {
  try {
    const icon = await IntentLauncher.getApplicationIconAsync(packageName);
    return Boolean(icon && icon.length > 0);
  } catch {
    return false;
  }
}

export async function listInstalledExternalPlayers(): Promise<ExternalPlayerTarget[]> {
  if (Platform.OS !== 'android') return [SYSTEM_PLAYER_TARGET];

  const installed: ExternalPlayerTarget[] = [];
  for (const player of KNOWN_PLAYERS) {
    if (!player.packageName) continue;
    if (await isPackageInstalled(player.packageName)) {
      installed.push(player);
    }
  }
  installed.push(SYSTEM_PLAYER_TARGET);
  return installed;
}

function extrasForPackage(
  packageName: string | undefined,
  title: string,
  positionMs: number,
): Record<string, string | number | boolean> {
  const base: Record<string, string | number | boolean> = {
    title,
    position: positionMs,
  };

  if (packageName === 'com.brouken.player') {
    return {
      title,
      position: Math.floor(positionMs),
      return_result: true,
    };
  }
  if (packageName === 'org.videolan.vlc') {
    return {
      title,
      position: positionMs,
      from_start: positionMs <= 0,
    };
  }
  if (packageName === 'is.xyz.mpv') {
    return {
      position: positionMs > 0 ? Math.floor(positionMs) : 1,
    };
  }
  return base;
}

export async function launchExternalPlayer(
  options: ExternalPlayerLaunchOptions,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (Platform.OS !== 'android') {
    return { ok: false, message: 'Внешний плеер доступен только на Android' };
  }

  const url = options.url?.trim();
  if (!url) {
    return { ok: false, message: 'Нет URL видео' };
  }

  const title = options.title?.trim() || 'AniVerse';
  const positionMs = Math.max(0, Math.floor((options.positionSeconds ?? 0) * 1000));
  const packageName =
    options.packageName === undefined
      ? getPlayerPreferencesSync().lastExternalPlayerPackage || undefined
      : options.packageName || undefined;

  try {
    if (packageName) {
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: url,
        type: 'video/*',
        packageName,
        // FLAG_ACTIVITY_NEW_TASK
        flags: 0x10000000,
        extra: extrasForPackage(packageName, title, positionMs),
      });
      void savePlayerPreferences({ lastExternalPlayerPackage: packageName });
      return { ok: true };
    }

    // System chooser — open as VIEW without package pin.
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: url,
      type: 'video/*',
      extra: {
        title,
        position: positionMs,
      },
    });
    void savePlayerPreferences({ lastExternalPlayerPackage: '' });
    return { ok: true };
  } catch {
    // Fallback: plain Linking (no extras).
    try {
      const can = await Linking.canOpenURL(url);
      if (!can) {
        return {
          ok: false,
          message: 'Нет приложения для открытия этого видео',
        };
      }
      await Linking.openURL(url);
      return { ok: true };
    } catch {
      return {
        ok: false,
        message: 'Не удалось открыть внешний плеер',
      };
    }
  }
}
