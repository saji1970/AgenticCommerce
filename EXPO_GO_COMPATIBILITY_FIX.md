# Expo Go Compatibility Issue Fix

## Problem
The error `java.lang.String cannot be cast to java.lang.Boolean` occurs because `@react-native-community/datetimepicker` is **not compatible with Expo Go**. This package requires native code that isn't included in Expo Go.

## Solution: Use Development Build Instead

Since you already have APK files in your project, you should use a **development build** instead of Expo Go.

### Option 1: Use Development Build (Recommended)

1. **Build a development APK** (if you haven't already):
   ```bash
   cd apps/mobile
   eas build --platform android --profile development
   ```

2. **Install the development build APK** on your device/emulator (not Expo Go)

3. **Start the development server**:
   ```bash
   cd apps/mobile
   npx expo start --dev-client
   ```

4. **Open the app** from the development build (not Expo Go)

### Option 2: Remove DateTimePicker for Expo Go Testing

If you need to test in Expo Go temporarily, you'll need to:
1. Remove or comment out the DateTimePicker usage
2. Use an alternative date picker solution that works with Expo Go
3. Or disable the "Scheduled Purchase" intent type when using Expo Go

## Why This Happens

Expo Go only includes a limited set of native modules. Packages like `@react-native-community/datetimepicker` that require custom native code need to be included in a development or production build.

## Recommendation

**Always use a development build** for this project since it uses:
- `@react-native-community/datetimepicker`
- `react-native-keychain`
- Other native modules

These packages are not compatible with Expo Go.

