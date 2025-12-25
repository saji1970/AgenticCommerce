# Expo EAS Build Guide

## What is EAS Build?

EAS (Expo Application Services) Build is Expo's cloud build service that builds your app on Expo's servers. It handles all the complexity of Android/iOS builds and produces working APKs/app bundles.

## Prerequisites

✅ EAS CLI is already installed (v16.28.0)
✅ eas.json is already configured in your project

## Step-by-Step Guide

### 1. Login to Expo Account

First, you need an Expo account. Login with:

```bash
npx eas login
```

If you don't have an account, create one at https://expo.dev/signup

### 2. Configure Your Project

Your project is already configured with `eas.json`. You have three build profiles:

- **development**: Debug build with dev tools
- **preview**: Release build as APK (recommended for testing)
- **production**: Release build as app bundle (for Play Store)

### 3. Build Your App

For a testable APK (recommended), run:

```bash
cd apps/mobile
npx eas build --profile preview --platform android
```

This will:
1. Upload your code to Expo's servers
2. Build the app in the cloud
3. Give you a download link when done (usually takes 5-15 minutes)

### 4. Download and Install

Once the build completes, you'll get a URL. Download the APK and install:

```bash
# Download the APK (use the URL from EAS)
curl -L <build-url> -o app.apk

# Install on your device
adb install app.apk
```

Or scan the QR code from the build page to download directly on your device.

## Build Profile Details

### Preview Build (Recommended for Testing)
```bash
npx eas build --profile preview --platform android
```
- Produces an APK file
- Can be installed directly on devices
- Uses release configuration
- No development tools

### Development Build
```bash
npx eas build --profile development --platform android
```
- Includes Expo Dev Client
- Can connect to Metro bundler
- Useful for debugging with native modules

### Production Build
```bash
npx eas build --profile production --platform android
```
- Produces an AAB (Android App Bundle)
- Optimized for Play Store
- Cannot be installed directly (needs bundletool or Play Store)

## Local Builds (Alternative)

If you prefer to build locally instead of cloud:

```bash
npx eas build --profile preview --platform android --local
```

This runs the build on your machine but uses EAS's build process.

## Common Commands

```bash
# Check build status
npx eas build:list

# View build details
npx eas build:view <build-id>

# Cancel a build
npx eas build:cancel

# Configure credentials (signing keys)
npx eas credentials
```

## Advantages Over Gradle Build

1. **Consistent builds**: Same build environment every time
2. **Cloud infrastructure**: No need for powerful local machine
3. **Automatic signing**: Handles keystore generation
4. **Better Expo integration**: Properly bundles JavaScript
5. **Build logs**: Detailed logs available online

## Cost

- **Free tier**: Limited builds per month
- **Paid plans**: Unlimited builds

Check current pricing at https://expo.dev/pricing

## Next Steps

1. Run `npx eas login` to authenticate
2. Run `npx eas build --profile preview --platform android`
3. Wait for build to complete (~10-15 minutes)
4. Download and install the APK
5. Test on your device

The EAS-built APK should not have the white screen issue since it uses Expo's proper build pipeline.
