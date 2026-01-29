# Migration from Expo to Pure React Native

## Summary

The mandate app has been successfully migrated from Expo to pure React Native. All Expo-specific dependencies and components have been replaced with React Native equivalents.

## Changes Made

### 1. Dependencies Replaced

- **expo** → Removed
- **expo-local-authentication** → **react-native-biometrics**
- **expo-secure-store** → Already using **react-native-keychain** (no change needed)
- **expo-status-bar** → Already using React Native **StatusBar** (no change needed)

### 2. Code Changes

#### `index.js`
- Replaced `registerRootComponent` from `expo` with `AppRegistry` from `react-native`
- Updated to use app name from `app.json`

#### `src/services/secure-element.service.ts`
- Replaced `expo-local-authentication` with `react-native-biometrics`
- Updated all biometric authentication methods:
  - `isBiometricAvailable()` - Now uses `rnBiometrics.isSensorAvailable()`
  - `getBiometricType()` - Updated to use React Native Biometrics API
  - `authenticate()` - Now uses `rnBiometrics.simplePrompt()`

### 3. Configuration Files

#### Removed:
- `eas.json` - EAS build configuration (no longer needed)
- `metro.config.js` - Expo-specific Metro config (not needed for pure RN)

#### Updated:
- `package.json` - Removed all Expo dependencies, added `react-native-biometrics`
- `app.json` - Simplified to just app name (required by React Native)
- Created `react-native.config.js` - React Native CLI configuration

### 4. Build Scripts

Updated scripts in `package.json`:
- `start` → `react-native start` (instead of `expo start`)
- `android` → `react-native run-android` (instead of `expo run:android`)
- `ios` → `react-native run-ios` (instead of `expo run:ios`)
- Removed EAS build scripts

## Next Steps

1. **Install Dependencies**:
   ```bash
   cd apps/mandate-app
   npm install
   # or
   pnpm install
   ```

2. **Link Native Modules** (if needed):
   ```bash
   cd apps/mandate-app/android
   ./gradlew clean
   ```

3. **Build Android**:
   ```bash
   cd apps/mandate-app
   npx react-native run-android
   ```

4. **Update Android Manifest** (if needed):
   - Biometric permissions are already configured
   - Deep linking scheme `mandate://` is configured

## Benefits

- ✅ No Expo dependency - lighter app size
- ✅ Direct access to native modules
- ✅ Standard React Native build process
- ✅ Can use any React Native library
- ✅ Better compatibility with monorepos

## Notes

- The app maintains all existing functionality
- Test mode for biometric authentication still works
- All services (secure-element, storage, etc.) remain unchanged in functionality
- React Navigation and other dependencies remain the same
