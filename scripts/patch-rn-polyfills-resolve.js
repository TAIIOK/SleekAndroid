/**
 * Expo CLI requires `react-native/rn-get-polyfills` from the hoisted monorepo
 * package. That copy is the site's React Native and does not export the subpath.
 * The TV app's react-native-tvos does ship the file.
 */
const Module = require('module');
const fs = require('fs');
const path = require('path');

const tvPolyfills = path.resolve(__dirname, '../node_modules/react-native/rn-get-polyfills.js');
const original = Module._resolveFilename;

Module._resolveFilename = function resolveRnPolyfills(request, parent, isMain, options) {
  if (
    (request === 'react-native/rn-get-polyfills' ||
      request === 'react-native/rn-get-polyfills.js') &&
    fs.existsSync(tvPolyfills)
  ) {
    return tvPolyfills;
  }
  return original.call(this, request, parent, isMain, options);
};
