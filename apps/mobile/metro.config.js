const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  watchFolders: [
    path.resolve(__dirname, '../..'),
    path.resolve(__dirname, '../../node_modules'),
  ],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../../node_modules'),
    ],
    extraNodeModules: {
      // Ensure Expo modules are resolved from root node_modules in monorepo
      'expo-modules-core': path.resolve(__dirname, '../../node_modules/expo-modules-core'),
      'expo-secure-store': path.resolve(__dirname, '../../node_modules/expo-secure-store'),
      'expo-local-authentication': path.resolve(__dirname, '../../node_modules/expo-local-authentication'),
      'expo-location': path.resolve(__dirname, '../../node_modules/expo-location'),
      'expo-camera': path.resolve(__dirname, '../../node_modules/expo-camera'),
      'expo-image-picker': path.resolve(__dirname, '../../node_modules/expo-image-picker'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
