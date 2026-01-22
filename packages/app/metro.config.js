const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const config = {
  resolver: {
    sourceExts: ['ts', 'tsx', 'js', 'jsx', 'json'],
    extraNodeModules: {
      '@env': require.resolve('react-native-dotenv'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);