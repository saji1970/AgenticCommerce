# Android Build Issues - Path Length Limitation

## Problem

Building the Android APK locally on Windows fails with path length errors during CMake configuration:

```
[CXX1428] exception while building Json A problem occurred starting process 'command '"C:\AgenticCommerce\node_modules\.pnpm\expo-modules-core@3.0.29_react-native@0.81.5_@babel+core@7.28.5_@react-native-community+cli@2_dwhcqdcz22vpp5pdiuadx5g6rq\node_modules\expo-modules-core\android\build\intermediates\cxx\Debug\6l2z1b1q\logs\arm64-v8a\prefab_command.bat"''
```

## Root Cause

1. **pnpm node_modules structure**: pnpm creates very long nested paths in `node_modules/.pnpm/` to handle peer dependencies
2. **CMake path limitation**: CMake has an internal limit of 250 characters for object file paths
3. **Windows MAX_PATH**: Even with LongPathsEnabled=1, some tools (like CMake) have hardcoded limits

Example problematic path:
```
C:\AgenticCommerce\node_modules\.pnpm\expo-modules-core@3.0.29_react-native@0.81.5_@babel+core@7.28.5_@react-native-community+cli@2_dwhcqdcz22vpp5pdiuadx5g6rq\node_modules\expo-modules-core\android\build\intermediates\cxx\Debug\6l2z1b1q\logs\arm64-v8a\prefab_command.bat
```
Length: ~260 characters (exceeds CMake's internal 250 limit)

## Failed Attempts

✗ Enabling Windows Long Paths (already enabled, but CMake still has limits)
✗ Building with Gradle directly (`./gradlew assembleDebug/assembleRelease`)
✗ Building with Expo CLI (`npx expo run:android`)
✗ Cleaning and rebuilding (`npx expo prebuild --clean`)

## Working Solutions

### Solution 1: Use EAS Build (Cloud) - RECOMMENDED
**Status**: ❌ Quota exceeded (resets in 20 days per DEPLOYMENT_STATUS.md)

Once quota resets:
```bash
cd apps/mobile
npx eas-cli build --platform android --profile preview
```

**Pros**: No local path issues, handles all dependencies correctly
**Cons**: Requires internet, uses EAS Build quota

### Solution 2: Move Project to Shorter Path - FEASIBLE NOW
Move the entire project to a directory with a much shorter path:

```powershell
# Move from C:\AgenticCommerce to C:\AC
cd C:\
robocopy C:\AgenticCommerce C:\AC /E /MOVE /NFL /NDL /NJH /NJS
cd C:\AC
pnpm install
cd apps\mobile
npx expo prebuild --clean
cd android
.\gradlew assembleDebug
```

**Pros**: Should work immediately
**Cons**: Requires moving project, updating git remote if applicable

### Solution 3: Use WSL2 (Windows Subsystem for Linux) - ALTERNATIVE
Build inside WSL2 where Linux doesn't have the same path limitations:

```bash
# In WSL2
cd /mnt/c/AgenticCommerce
pnpm install
cd apps/mobile
npx expo run:android --variant release
```

**Pros**: Linux filesystem handles long paths better
**Cons**: Requires WSL2 setup, Android SDK in WSL2

### Solution 4: Switch to npm or yarn - DRASTIC
Replace pnpm with npm or yarn which have flatter node_modules structures:

```bash
# Remove pnpm
rm -rf node_modules
rm pnpm-lock.yaml

# Use npm
npm install
cd apps/mobile
npx expo prebuild --clean
npx expo run:android
```

**Pros**: May reduce path lengths
**Cons**: Loses pnpm benefits, may have other dependency issues

## Recommended Immediate Action

**Try Solution 2 first** (move to shorter path):

1. Create a short path directory: `C:\AC`
2. Move project there
3. Reinstall dependencies: `pnpm install`
4. Clean rebuild Android: `npx expo prebuild --platform android --clean`
5. Build APK: `cd android && .\gradlew assembleDebug`

## Alternative: Deploy to Emulator Without Building APK

If you have an Android emulator or physical device connected, you can run the app without creating an APK file:

```bash
# Start emulator first (Android Studio > AVD Manager)
cd apps/mobile
npx expo start

# In another terminal, install to device/emulator
npx expo run:android
```

This uses Metro bundler and doesn't require building a standalone APK.

## Why This Affects Our Project

- React Native 0.81.5 with Expo 54
- Multiple native modules with CMake builds:
  - expo-modules-core
  - react-native-gesture-handler
  - react-native-screens
  - react-native-reanimated (if present)
- pnpm workspace structure adds extra path depth
- Windows development environment

## References

- [Gradle Issue #19664](https://github.com/gradle/gradle/issues/19664) - Path too long on Windows
- [Expo docs](https://docs.expo.dev/build/setup/) - EAS Build setup
- [React Native docs](https://reactnative.dev/docs/environment-setup) - Environment setup
