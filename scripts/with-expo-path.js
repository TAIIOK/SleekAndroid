/**
 * Ensures @expo/cli (hoisted to monorepo root) can resolve expo-router and peers
 * from aniverse-tv/node_modules when using npm workspaces.
 */
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const localModules = path.resolve(__dirname, '../node_modules');
const rootModules = path.resolve(__dirname, '../../node_modules');
const nestedRouterModules = path.join(localModules, 'expo-router/node_modules');
const nestedExpoModules = path.join(localModules, 'expo/node_modules');

const extraPaths = [
  localModules,
  nestedRouterModules,
  nestedExpoModules,
  rootModules,
  process.env.NODE_PATH,
]
  .filter(Boolean)
  .join(path.delimiter);

const [, , command, ...args] = process.argv;
if (!command) {
  console.error('Usage: node with-expo-path.js <command> [args...]');
  process.exit(1);
}

const fs = require('node:fs');

/** JDK 25 breaks CMake configure for RN native modules; prefer 17 when present. */
function resolveAndroidJavaHome() {
  if (process.env.JAVA_HOME && !/openjdk-?25|jdk-?25/i.test(process.env.JAVA_HOME)) {
    return process.env.JAVA_HOME;
  }
  const candidates = [
    '/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home',
    '/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home',
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'bin/java'))) return candidate;
  }
  return process.env.JAVA_HOME;
}

const env = {
  ...process.env,
  NODE_PATH: extraPaths,
};

const javaHome = resolveAndroidJavaHome();
if (javaHome) {
  env.JAVA_HOME = javaHome;
  env.PATH = `${path.join(javaHome, 'bin')}${path.delimiter}${env.PATH || ''}`;
}

const result = spawnSync(command, args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env,
});

process.exit(result.status ?? 1);
