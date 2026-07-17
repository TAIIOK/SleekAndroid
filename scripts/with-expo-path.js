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

const result = spawnSync(command, args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    NODE_PATH: extraPaths,
  },
});

process.exit(result.status ?? 1);
