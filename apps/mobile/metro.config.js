const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

// Get the default Expo Metro config
const config = getDefaultConfig(__dirname);

// Support for monorepo structure
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

// Watch all files in the workspace
config.watchFolders = [workspaceRoot];

// Allow imports from workspace packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Support pnpm's symlinked node_modules
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
