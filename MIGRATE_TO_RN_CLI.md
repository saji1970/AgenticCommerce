# Migrate from Expo to React Native CLI

## Step 1: Remove Expo Dependencies

```bash
cd C:\AgenticCommerce\apps\mobile

# Remove Expo packages
npm uninstall expo expo-dev-client expo-av expo-build-properties expo-image-manipulator expo-local-authentication expo-location expo-secure-store expo-status-bar @expo/config-plugins

# Remove Expo prebuild artifacts
rmdir /s /q android
rmdir /s /q ios
```

## Step 2: Initialize React Native CLI Project

```bash
# Install React Native CLI globally
npm install -g react-native-cli

# Initialize fresh React Native project in temp location
cd C:\
npx react-native init AgenticCommerceTemp --version 0.74.5

# Copy native folders to your project
xcopy C:\AgenticCommerceTemp\android C:\AgenticCommerce\apps\mobile\android\ /E /I /Y
xcopy C:\AgenticCommerceTemp\ios C:\AgenticCommerce\apps\mobile\ios\ /E /I /Y

# Copy metro config
copy C:\AgenticCommerceTemp\metro.config.js C:\AgenticCommerce\apps\mobile\
copy C:\AgenticCommerceTemp\react-native.config.js C:\AgenticCommerce\apps\mobile\

# Clean up temp
rmdir /s /q C:\AgenticCommerceTemp
```

## Step 3: Update package.json

Replace scripts in `apps/mobile/package.json`:

```json
{
  "scripts": {
    "android": "react-native run-android",
    "ios": "react-native run-ios",
    "start": "react-native start",
    "test": "jest",
    "lint": "eslint . --ext .ts,.tsx"
  }
}
```

Remove Expo dependencies, keep:
- react-native
- All other dependencies (navigation, redux, stripe, etc.)

## Step 4: Update index.js

```javascript
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
```

## Step 5: Link Native Modules

```bash
cd C:\AgenticCommerce\apps\mobile

# Auto-link native modules
npx react-native link

# Manual links if needed
npx react-native link react-native-vector-icons
npx react-native link @react-native-async-storage/async-storage
npx react-native link react-native-maps
```

## Step 6: Update app.json

Simplify to just:

```json
{
  "name": "AgenticCommerce",
  "displayName": "Agentic Commerce"
}
```

## Step 7: Build and Run

```bash
# Clean and build
cd android
./gradlew clean
./gradlew assembleDebug

# Install on device
adb install app/build/outputs/apk/debug/app-debug.apk

# Start Metro bundler
cd ..
npx react-native start

# Or run directly
npx react-native run-android
```

## Benefits of Pure React Native:

✅ No Expo abstraction layer
✅ Direct control over native code
✅ Faster builds
✅ No version compatibility issues
✅ Full access to all native modules
✅ Standard React Native debugging

## What You Lose:

❌ Expo Go quick testing
❌ OTA updates
❌ EAS Build cloud builds
❌ Expo managed config

## Time Estimate: 20-30 minutes
