const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  resolver: {
    assetExts: [...defaultConfig.resolver.assetExts, 'tflite', 'txt'],
    sourceExts: [...defaultConfig.resolver.sourceExts, 'ts', 'tsx'],
  },
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  watchFolders: [],
};

module.exports = mergeConfig(defaultConfig, config);