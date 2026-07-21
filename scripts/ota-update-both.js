/**
 * Publish one OTA to phone + TV channels (same message).
 *
 * Usage:
 *   npm run update:all -- "Fix search focus"
 *   npm run update:all -- "Fix search focus" --version 1.0.1
 *   npm run update:all:preview -- "QA: new rails" --version 1.0.1
 *
 * --version writes app.config.ts + package.json, then publishes.
 * With runtimeVersion policy "appVersion", only APKs built with that
 * version receive the update. Bumping version for OTA alone will NOT
 * reach older sideload installs — rebuild phone+TV APKs for that version.
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const APP_CONFIG = path.join(ROOT, 'app.config.ts');
const PACKAGE_JSON = path.join(ROOT, 'package.json');
const VERSION_RE = /^\d+\.\d+\.\d+([-+][0-9A-Za-z.-]+)?$/;

function usage(exitCode = 1) {
  console.error(`Usage:
  npm run update:all -- "<message>" [--version X.Y.Z]
  npm run update:all:preview -- "<message>" [--version X.Y.Z]

Examples:
  npm run update:all -- "Fix search focus"
  npm run update:all -- "Fix search focus" --version 1.0.1`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const preview = argv.includes('--preview');
  let version;
  const messageParts = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--preview') continue;
    if (arg === '--message') continue;
    if (arg === '--version' || arg === '-v') {
      version = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith('--version=')) {
      version = arg.slice('--version='.length);
      continue;
    }
    messageParts.push(arg);
  }

  return {
    preview,
    version: version?.trim() || undefined,
    message: messageParts.join(' ').trim(),
  };
}

function readCurrentVersion() {
  const text = fs.readFileSync(APP_CONFIG, 'utf8');
  const match = text.match(/version:\s*'([^']+)'/);
  return match?.[1] ?? null;
}

function setVersion(version) {
  if (!VERSION_RE.test(version)) {
    console.error(`Invalid version "${version}". Expected semver like 1.0.1`);
    process.exit(1);
  }

  const appConfig = fs.readFileSync(APP_CONFIG, 'utf8');
  if (!/version:\s*'[^']+'/.test(appConfig)) {
    console.error(`Could not find version: '...' in ${APP_CONFIG}`);
    process.exit(1);
  }
  fs.writeFileSync(APP_CONFIG, appConfig.replace(/version:\s*'[^']+'/, `version: '${version}'`));

  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
  pkg.version = version;
  fs.writeFileSync(PACKAGE_JSON, `${JSON.stringify(pkg, null, 2)}\n`);

  console.log(`Updated version → ${version} (app.config.ts, package.json)`);
}

const { preview, version, message } = parseArgs(process.argv.slice(2));
if (!message) usage();

const previousVersion = readCurrentVersion();
if (version) {
  setVersion(version);
  if (previousVersion && previousVersion !== version) {
    console.warn(
      `\n⚠ runtimeVersion follows appVersion. OTA "${version}" will only apply to APKs built as ${version}.`,
    );
    console.warn(
      `  Already installed ${previousVersion} builds will keep waiting for channel updates on runtime ${previousVersion}.`,
    );
    console.warn(`  After bumping, rebuild: npm run android:release:phone && npm run android:release:tv\n`);
  }
}

const publishVersion = version || previousVersion || 'unknown';
const easMessage = `[${publishVersion}] ${message}`;

const targets = preview
  ? [
      { label: 'phone', channel: 'preview', env: { ...process.env }, environment: 'preview' },
      {
        label: 'TV',
        channel: 'preview-tv',
        env: { ...process.env, EXPO_TV: '1' },
        environment: 'preview',
      },
    ]
  : [
      { label: 'phone', channel: 'production', env: { ...process.env }, environment: 'production' },
      {
        label: 'TV',
        channel: 'production-tv',
        env: { ...process.env, EXPO_TV: '1' },
        environment: 'production',
      },
    ];

for (const target of targets) {
  console.log(`\n→ Publishing ${target.label} → ${target.channel} (runtime ${publishVersion})\n`);
  const result = spawnSync(
    'npx',
    [
      'eas-cli@latest',
      'update',
      '--channel',
      target.channel,
      '--environment',
      target.environment,
      '--message',
      easMessage,
      '--non-interactive',
    ],
    {
      env: target.env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    },
  );
  if (result.status !== 0) {
    console.error(`\nFailed publishing ${target.label} (${target.channel}).`);
    process.exit(result.status ?? 1);
  }
}

console.log(`\nDone: phone + TV ← "${easMessage}"`);
