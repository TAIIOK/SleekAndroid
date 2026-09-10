const { withAndroidManifest } = require('@expo/config-plugins');

const PERMISSION = 'android.permission.REQUEST_INSTALL_PACKAGES';

function ensureUsesPermission(manifest, name) {
  if (!manifest['uses-permission']) {
    manifest['uses-permission'] = [];
  }
  const list = manifest['uses-permission'];
  const exists = list.some((entry) => entry.$?.['android:name'] === name);
  if (!exists) {
    list.push({ $: { 'android:name': name } });
  }
}

/** Allow sideloaded APK updates to launch the system package installer. */
function withInstallPackages(config) {
  return withAndroidManifest(config, (config) => {
    ensureUsesPermission(config.modResults.manifest, PERMISSION);
    return config;
  });
}

module.exports = withInstallPackages;
