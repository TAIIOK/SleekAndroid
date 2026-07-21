/**
 * Build sideload release APKs for phone + TV into dist/.
 *
 * Usage:
 *   npm run android:release:all
 *   npm run android:release:all -- --version 1.0.1
 *   npm run android:release:all -- --phone
 *   npm run android:release:all -- --tv
 *
 * Outputs:
 *   dist/sleek.apk      → ru.taiiok.aniverse.app
 *   dist/sleek-tv.apk   → ru.taiiok.aniverse.tv (forceTvUi)
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const APP_CONFIG = path.join(ROOT, 'app.config.ts');
const PACKAGE_JSON = path.join(ROOT, 'package.json');
const DIST = path.join(ROOT, 'dist');
const GRADLE_APK = path.join(ROOT, 'android/app/build/outputs/apk/release/app-release.apk');
const VERSION_RE = /^\d+\.\d+\.\d+([-+][0-9A-Za-z.-]+)?$/;

function usage(exitCode = 1) {
  console.error(`Usage:
  npm run android:release:all [-- --version X.Y.Z] [--phone] [--tv]

Outputs:
  dist/sleek.apk
  dist/sleek-tv.apk`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  let version;
  let phone = false;
  let tv = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') usage(0);
    if (arg === '--phone') {
      phone = true;
      continue;
    }
    if (arg === '--tv') {
      tv = true;
      continue;
    }
    if (arg === '--version' || arg === '-v') {
      version = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith('--version=')) {
      version = arg.slice('--version='.length);
      continue;
    }
    console.error(`Unknown argument: ${arg}`);
    usage();
  }

  // Default: both targets
  if (!phone && !tv) {
    phone = true;
    tv = true;
  }

  return { version: version?.trim() || undefined, phone, tv };
}

function readCurrentVersion() {
  const text = fs.readFileSync(APP_CONFIG, 'utf8');
  const match = text.match(/version:\s*'([^']+)'/);
  return match?.[1] ?? '0.0.0';
}

function setVersion(version) {
  if (!VERSION_RE.test(version)) {
    console.error(`Invalid version "${version}". Expected semver like 1.0.1`);
    process.exit(1);
  }

  let appConfig = fs.readFileSync(APP_CONFIG, 'utf8');
  if (!/version:\s*'[^']+'/.test(appConfig)) {
    console.error(`Could not find version: '...' in ${APP_CONFIG}`);
    process.exit(1);
  }
  const prevVersion = appConfig.match(/version:\s*'([^']+)'/)?.[1];
  appConfig = appConfig.replace(/version:\s*'[^']+'/, `version: '${version}'`);

  // Keep Android versionCode ahead of previous when the marketing version changes.
  if (prevVersion && prevVersion !== version) {
    const codeMatch = appConfig.match(/versionCode:\s*(\d+)/);
    if (codeMatch) {
      const nextCode = Number(codeMatch[1]) + 1;
      appConfig = appConfig.replace(/versionCode:\s*\d+/, `versionCode: ${nextCode}`);
      console.log(`Bumped versionCode → ${nextCode}`);
    }
  }

  fs.writeFileSync(APP_CONFIG, appConfig);

  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
  pkg.version = version;
  fs.writeFileSync(PACKAGE_JSON, `${JSON.stringify(pkg, null, 2)}\n`);

  console.log(`Updated version → ${version}`);
}

function run(command, args, env = {}) {
  console.log(`$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) {
    console.error(`\nCommand failed (${result.status ?? 1}): ${command} ${args.join(' ')}`);
    process.exit(result.status ?? 1);
  }
}

/** Prebuild resets gradle.properties — bump heap/metaspace for KSP + lint on large graphs. */
function boostGradleMemory() {
  const propsPath = path.join(ROOT, 'android/gradle.properties');
  if (!fs.existsSync(propsPath)) return;
  let text = fs.readFileSync(propsPath, 'utf8');
  const next =
    'org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8';
  if (/^org\.gradle\.jvmargs=/m.test(text)) {
    text = text.replace(/^org\.gradle\.jvmargs=.*$/m, next);
  } else {
    text = `${next}\n${text}`;
  }
  fs.writeFileSync(propsPath, text);
  console.log('Boosted org.gradle.jvmargs (4g heap / 1g metaspace)');
}

function copyApk(fileName) {
  if (!fs.existsSync(GRADLE_APK)) {
    console.error(`\nAPK not found: ${GRADLE_APK}`);
    process.exit(1);
  }
  fs.mkdirSync(DIST, { recursive: true });
  const dest = path.join(DIST, fileName);
  fs.copyFileSync(GRADLE_APK, dest);
  const sizeMb = (fs.statSync(dest).size / (1024 * 1024)).toFixed(1);
  console.log(`✓ ${dest} (${sizeMb} MB)`);
  return dest;
}

function assembleRelease(env = {}) {
  boostGradleMemory();
  run(
    'node',
    ['./scripts/with-expo-path.js', './android/gradlew', '-p', 'android', '--stop'],
    env,
  );
  run(
    'node',
    [
      './scripts/with-expo-path.js',
      './android/gradlew',
      '-p',
      'android',
      'assembleRelease',
      '-x',
      'lintVitalAnalyzeRelease',
    ],
    { NODE_ENV: 'production', ...env },
  );
}

function buildPhone() {
  console.log('\n=== Phone (sleek.apk) ===\n');
  run('node', [
    './scripts/with-expo-path.js',
    'expo',
    'prebuild',
    '--clean',
    '--platform',
    'android',
  ]);
  assembleRelease();
  return copyApk('sleek.apk');
}

function buildTv() {
  console.log('\n=== TV (sleek-tv.apk) ===\n');
  run(
    'node',
    ['./scripts/with-expo-path.js', 'expo', 'prebuild', '--clean', '--platform', 'android'],
    { EXPO_TV: '1' },
  );
  assembleRelease({ EXPO_TV: '1' });
  return copyApk('sleek-tv.apk');
}

const { version, phone, tv } = parseArgs(process.argv.slice(2));
if (version) setVersion(version);

const appVersion = version || readCurrentVersion();
console.log(`Building release APKs (version ${appVersion})`);

const outputs = [];
if (phone) outputs.push(buildPhone());
if (tv) outputs.push(buildTv());

console.log('\nDone:');
for (const file of outputs) console.log(`  ${file}`);
