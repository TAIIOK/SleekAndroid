import Constants from 'expo-constants';
import { Platform } from 'react-native';

function packageLooksLikeTv(pkg: string | undefined | null): boolean {
  if (!pkg) return false;
  return pkg === 'ru.taiiok.aniverse.tv' || pkg.endsWith('.tv');
}

/**
 * True for TV UI.
 * Prefer `extra.forceTvUi` from the TV APK embed; also accept TV application ids
 * and Platform.isTV (uiMode === 'tv'). Some boxes mis-report uiMode as phone —
 * those need forceTvUi baked with EXPO_TV=1 during assembleRelease.
 */
export function isTvUi(): boolean {
  const extra = Constants.expoConfig?.extra as { forceTvUi?: boolean } | undefined;
  if (extra?.forceTvUi === true) return true;

  if (packageLooksLikeTv(Constants.expoConfig?.android?.package)) return true;

  const iosBundle = Constants.expoConfig?.ios?.bundleIdentifier;
  if (iosBundle === 'com.anonymous.aniversetv.tv' || iosBundle?.endsWith('.tv')) {
    return true;
  }

  return Platform.isTV;
}
