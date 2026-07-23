/**
 * Ensure android/ matches the requested phone/TV variant.
 * `expo run:android` does not re-prebuild, so a leftover TV project
 * can be installed onto a phone emulator (wrong applicationId / leanback).
 *
 * Usage:
 *   node ./scripts/ensure-android-variant.js phone
 *   node ./scripts/ensure-android-variant.js tv
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const GRADLE = path.join(ROOT, 'android/app/build.gradle');
const MANIFEST = path.join(ROOT, 'android/app/src/main/AndroidManifest.xml');

const wanted = (process.argv[2] || '').trim();
if (wanted !== 'phone' && wanted !== 'tv') {
  console.error('Usage: node ./scripts/ensure-android-variant.js <phone|tv>');
  process.exit(1);
}

function detectVariant() {
  if (!fs.existsSync(GRADLE)) return null;
  const gradle = fs.readFileSync(GRADLE, 'utf8');
  if (gradle.includes("applicationId 'ru.taiiok.aniverse.tv'")) return 'tv';
  if (gradle.includes("applicationId 'ru.taiiok.aniverse.app'")) return 'phone';

  if (fs.existsSync(MANIFEST)) {
    const manifest = fs.readFileSync(MANIFEST, 'utf8');
    if (manifest.includes('android.software.leanback" android:required="true"')) return 'tv';
  }
  return null;
}

const current = detectVariant();
if (current === wanted) {
  console.log(`android/ already ${wanted}`);
  process.exit(0);
}

const script = wanted === 'tv' ? 'prebuild:tv' : 'prebuild:phone';
console.log(
  current
    ? `android/ is ${current}, need ${wanted} — running npm run ${script}…`
    : `android/ missing or unknown — running npm run ${script}…`,
);

const result = spawnSync('npm', ['run', script], {
  cwd: ROOT,
  stdio: 'inherit',
  env: process.env,
});
process.exit(result.status ?? 1);
