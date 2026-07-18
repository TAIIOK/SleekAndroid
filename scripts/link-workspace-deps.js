/**
 * npm workspaces: @expo/cli at monorepo root cannot resolve packages that live only
 * under aniverse-tv/node_modules (or nested there). Symlink them into root node_modules.
 */
const fs = require('node:fs');
const path = require('node:path');

const workspaceModules = path.resolve(__dirname, '../node_modules');
const rootModules = path.resolve(__dirname, '../../node_modules');

if (!fs.existsSync(workspaceModules)) {
  console.warn('[aniverse-tv] workspace node_modules missing, skip link');
  process.exit(0);
}

fs.mkdirSync(rootModules, { recursive: true });

const linked = [];

function shouldLink(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  try {
    const stat = fs.lstatSync(targetPath);
    return stat.isSymbolicLink() || stat.isDirectory();
  } catch {
    return false;
  }
}

function linkIntoRoot(relativeName, sourcePath) {
  const destPath = path.join(rootModules, relativeName);

  if (fs.existsSync(destPath)) {
    try {
      const stat = fs.lstatSync(destPath);
      if (stat.isSymbolicLink()) {
        const resolved = path.resolve(rootModules, fs.readlinkSync(destPath));
        if (resolved === sourcePath) return;
        fs.unlinkSync(destPath);
      } else {
        return;
      }
    } catch {
      /* attempt link below */
    }
  }

  fs.mkdirSync(path.dirname(destPath), { recursive: true });

  const type = process.platform === 'win32' ? 'junction' : 'dir';
  fs.symlinkSync(sourcePath, destPath, type);
  linked.push(relativeName);
}

function linkPackageAt(relativeName, sourcePath) {
  if (!shouldLink(sourcePath)) return;
  linkIntoRoot(relativeName, sourcePath);
}

function linkDirectoryEntries(baseDir, relativePrefix = '') {
  if (!fs.existsSync(baseDir)) return;

  for (const name of fs.readdirSync(baseDir)) {
    if (name.startsWith('.')) continue;
    const sourcePath = path.join(baseDir, name);
    const relativeName = relativePrefix ? `${relativePrefix}/${name}` : name;

    if (name.startsWith('@')) {
      if (!shouldLink(sourcePath)) continue;
      for (const sub of fs.readdirSync(sourcePath)) {
        if (sub.startsWith('.')) continue;
        linkPackageAt(`${name}/${sub}`, path.join(sourcePath, sub));
      }
      continue;
    }

    linkPackageAt(relativeName, sourcePath);
  }
}

// Top-level workspace packages (expo-router, etc.)
linkDirectoryEntries(workspaceModules);

// Nested deps (e.g. expo-router/node_modules/@expo/metro-runtime)
for (const parent of ['expo-router', 'expo']) {
  linkDirectoryEntries(path.join(workspaceModules, parent, 'node_modules'));
}

/**
 * npm workspaces sometimes install plain `react-native` under aniverse-tv while
 * the root has `react-native-tvos`. Dual copies break Metro/native registration.
 */
function ensureReactNativeTvos() {
  const localRn = path.join(workspaceModules, 'react-native');
  const rootRn = path.join(rootModules, 'react-native');
  const tvMarker = path.join(rootRn, 'Libraries/Components/TV/useTVEventHandler.js');

  if (!fs.existsSync(tvMarker)) {
    console.warn('[aniverse-tv] root react-native-tvos missing; skip RN link');
    return;
  }

  const localIsTvos = fs.existsSync(
    path.join(localRn, 'Libraries/Components/TV/useTVEventHandler.js'),
  );
  if (localIsTvos) return;

  try {
    if (fs.existsSync(localRn) || fs.lstatSync(localRn).isSymbolicLink()) {
      fs.rmSync(localRn, { recursive: true, force: true });
    }
  } catch {
    /* missing or already removed */
  }

  const type = process.platform === 'win32' ? 'junction' : 'dir';
  fs.symlinkSync(rootRn, localRn, type);
  console.log('[aniverse-tv] Linked local react-native → monorepo react-native-tvos');
}

ensureReactNativeTvos();

if (linked.length) {
  console.log(`[aniverse-tv] Linked ${linked.length} package(s) to monorepo root: ${linked.join(', ')}`);
} else {
  console.log('[aniverse-tv] Workspace deps already linked at monorepo root');
}
