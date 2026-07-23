const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

/**
 * react-native-video's ExoPlayerView defaults useController=true.
 * When JS passes controls={false}, Fabric may omit the prop and the native
 * Exo chrome (center play, seek, settings gear) stays visible on top of our UI.
 * Force the native default off.
 */
function resolveVideoRoot(projectRoot) {
  try {
    return path.dirname(
      require.resolve('react-native-video/package.json', { paths: [projectRoot] }),
    );
  } catch {
    return null;
  }
}

function patchExoPlayerView(videoRoot) {
  const ktPath = path.join(
    videoRoot,
    'android/src/main/java/com/brentvatne/exoplayer/ExoPlayerView.kt',
  );
  if (!fs.existsSync(ktPath)) {
    throw new Error(`ExoPlayerView.kt not found at ${ktPath}`);
  }
  let src = fs.readFileSync(ktPath, 'utf8');
  const from = '        useController = true\n';
  const to = '        useController = false\n';
  if (src.includes(to) && !src.includes(from)) {
    return false;
  }
  if (!src.includes(from)) {
    throw new Error('ExoPlayerView.kt useController default not found — update plugin');
  }
  src = src.replace(from, to);
  fs.writeFileSync(ktPath, src);
  return true;
}

function withRnVideoDisableDefaultControls(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const videoRoot = resolveVideoRoot(cfg.modRequest.projectRoot);
      if (!videoRoot) {
        throw new Error('react-native-video not found');
      }
      const changed = patchExoPlayerView(videoRoot);
      console.log(
        changed
          ? `[withRnVideoDisableDefaultControls] useController default → false`
          : `[withRnVideoDisableDefaultControls] already patched`,
      );
      return cfg;
    },
  ]);
}

module.exports = withRnVideoDisableDefaultControls;
