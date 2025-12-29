# Metro Bundler Error Fix

## Error: Cannot find module 'jest-worker/build/workers/processChild.js'

This error occurs when Metro bundler's dependencies are corrupted or incomplete.

## Solutions

### Solution 1: Complete Clean Reinstall (Recommended)

```bash
# From project root
cd C:\AgenticCommerce

# Remove all node_modules
Remove-Item -Recurse -Force node_modules

# Remove package-lock.json
Remove-Item package-lock.json

# Reinstall everything
npm install
npm install --workspaces

# Start Expo
cd apps/mobile-new
npm start -- --clear
```

### Solution 2: Reinstall Expo Dependencies

```bash
cd apps/mobile-new
npm install expo@latest
npm install @expo/metro-config@latest
npx expo install --fix
npm start -- --clear
```

### Solution 3: Use Yarn Instead of npm

If npm continues to have issues, try using yarn:

```bash
# Install yarn
npm install -g yarn

# Remove node_modules and package-lock.json
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json

# Install with yarn
yarn install

# Start Expo
cd apps/mobile-new
yarn start --clear
```

### Solution 4: Clear All Caches

```bash
# Clear npm cache
npm cache clean --force

# Clear Expo cache
cd apps/mobile-new
npx expo start --clear

# Clear Metro bundler cache
rm -rf .expo
rm -rf node_modules/.cache
```

### Solution 5: Use EAS Build Instead

If Metro continues to have issues locally, use EAS Build which handles dependencies in the cloud:

```bash
cd apps/mobile-new
npm run build:android
```

## Root Cause

This error typically happens when:
- Dependencies are corrupted during installation
- Version conflicts between jest-worker versions
- Node.js version incompatibility (you're using v24.7.0, which is very new)
- Metro bundler's nested dependencies aren't properly installed

## Temporary Workaround

If you need to test the app immediately:
1. Use EAS Build (builds in the cloud, no local Metro needed)
2. Or try using an older Node.js version (18.x or 20.x LTS)

## Recommended Node.js Version

Expo/React Native typically work best with Node.js LTS versions:
- Node.js 18.x LTS (recommended)
- Node.js 20.x LTS (also supported)

Node.js v24.7.0 is very new and may have compatibility issues.



