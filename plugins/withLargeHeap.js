const { withAndroidManifest } = require('@expo/config-plugins');

/** Enable android:largeHeap for 4K / high-bitrate playback on TV. */
function withLargeHeap(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (application?.$) {
      application.$['android:largeHeap'] = 'true';
    }
    return config;
  });
}

module.exports = withLargeHeap;
