#!/usr/bin/env node
/**
 * Verifies OTA (EAS Update) config is ready before shipping a release APK.
 * Does not distribute the APK — run `npm run android:release:all` after this passes.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const appConfigPath = path.join(root, 'app.config.ts');
const appConfig = fs.readFileSync(appConfigPath, 'utf8');
const easPath = path.join(root, 'eas.json');

const errors = [];

if (!pkg.dependencies?.['expo-updates']) {
  errors.push('expo-updates missing from dependencies');
}
if (!appConfig.includes("'expo-updates'") && !appConfig.includes('"expo-updates"')) {
  errors.push('expo-updates plugin not listed in app.config.ts');
}
if (!appConfig.includes('u.expo.dev')) {
  errors.push('updates.url missing in app.config.ts');
}
if (!appConfig.includes('runtimeVersion')) {
  errors.push('runtimeVersion missing in app.config.ts');
}
if (!fs.existsSync(easPath)) {
  errors.push('eas.json missing');
} else {
  const eas = JSON.parse(fs.readFileSync(easPath, 'utf8'));
  for (const profile of ['production_android', 'production_android_tv']) {
    if (!eas.build?.[profile]) errors.push(`eas.json missing build profile ${profile}`);
  }
}

if (errors.length) {
  console.error('OTA preflight FAILED:');
  for (const err of errors) console.error(` - ${err}`);
  process.exit(1);
}

console.log('OTA preflight OK');
console.log('Next: npm run android:release:all  →  distribute dist/*.apk once');
console.log('Then: npm run update:all -- "message" to push JS updates');
