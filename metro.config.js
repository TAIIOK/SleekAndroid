// Learn more https://docs.expo.io/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const expoUiComposeStub = path.resolve(__dirname, 'src/shims/expo-ui-jetpack-compose.js');
const expoUiModifiersStub = path.resolve(__dirname, 'src/shims/expo-ui-modifiers.js');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@expo/ui/jetpack-compose') {
    return { type: 'sourceFile', filePath: expoUiComposeStub };
  }
  if (moduleName === '@expo/ui/jetpack-compose/modifiers') {
    return { type: 'sourceFile', filePath: expoUiModifiersStub };
  }
  return context.resolveRequest(context, moduleName, platform);
};

// When enabled, Metro will resolve TV-specific extensions
// (e.g., *.ios.tv.tsx, *.android.tv.tsx, *.tv.tsx)
if (process.env?.EXPO_TV === '1') {
  const originalSourceExts = config.resolver.sourceExts;
  config.resolver.sourceExts = [
    ...originalSourceExts.map((e) => `tv.${e}`),
    ...originalSourceExts,
  ];
}

module.exports = config;
