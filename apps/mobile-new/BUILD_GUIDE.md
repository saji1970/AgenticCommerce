# Build Guide - Android & iOS Apps

This guide explains how to build native Android and iOS apps from the Agentic Commerce mobile app.

## 📱 Prerequisites

### For Android Builds
- **Node.js 18+** and npm
- **EAS CLI** (Expo Application Services)
  ```bash
  npm install -g eas-cli
  ```
- **Expo Account** (free at https://expo.dev)
  ```bash
  eas login
  ```

### For iOS Builds (macOS only)
- All Android prerequisites
- **macOS** (required for iOS builds)
- **Xcode** (latest version from Mac App Store)
- **Apple Developer Account** ($99/year) for production builds

## 🚀 Quick Start

### 1. Install EAS CLI

```bash
npm install -g eas-cli
```

### 2. Login to Expo

```bash
eas login
```

### 3. Configure EAS Project

```bash
eas build:configure
```

This will create/update `eas.json` and set up your project.

## 📦 Building Apps

### Android APK (Preview/Testing)

```bash
npm run build:android
```

This creates an APK file you can install directly on Android devices.

**Output:** Download link will be provided after build completes (usually 10-15 minutes)

### Android AAB (Production - Google Play Store)

```bash
npm run build:android:production
```

This creates an Android App Bundle (AAB) for submission to Google Play Store.

### iOS Build (Preview/Testing)

```bash
npm run build:ios
```

**Note:** iOS builds require macOS. You can also build on EAS servers (recommended).

### iOS Build (Production - App Store)

```bash
npm run build:ios:production
```

Requires:
- Apple Developer Account
- App Store Connect configuration
- Distribution certificates

## 🏗️ Building Locally (Alternative)

If you want to build locally instead of using EAS:

### Generate Native Projects

```bash
npm run prebuild:clean
```

This generates:
- `android/` - Android native project
- `ios/` - iOS native project (macOS only)

### Build Android Locally

```bash
cd android
./gradlew assembleRelease
```

APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

### Build iOS Locally (macOS only)

1. Open `ios/AgenticCommerce.xcworkspace` in Xcode
2. Select your device/simulator
3. Product → Archive
4. Distribute to App Store or export for testing

## ⚙️ Configuration

### App Configuration

Edit `app.json` to customize:
- App name
- Bundle identifier (iOS) / Package name (Android)
- Version number
- Icons and splash screens
- Permissions

### API Configuration

Update `src/config/api.ts` with your backend URL:

```typescript
const RAILWAY_API_URL = 'https://your-app.railway.app/api/v1';
```

### EAS Build Configuration

Edit `eas.json` to customize build profiles:
- Build types (development, preview, production)
- Resource allocation
- Environment variables

## 📱 Installing Builds

### Android APK

1. Download the APK from the EAS build link
2. Enable "Install from unknown sources" on your Android device
3. Transfer APK to device and install

### iOS (TestFlight)

1. Build is automatically uploaded to App Store Connect
2. Add testers in TestFlight
3. Testers receive email invitation

### iOS (Ad Hoc)

1. Download the `.ipa` file
2. Use Xcode or Apple Configurator to install on registered devices

## 🔐 Signing & Certificates

### Android

EAS automatically manages:
- Keystore generation
- Signing keys
- Google Play signing

### iOS

First build will prompt for:
- Apple Developer Account credentials
- Automatic certificate management (recommended)
- Or manual certificate upload

## 🧪 Testing Builds

### Android

1. Build preview APK: `npm run build:android`
2. Download and install on device
3. Test all functionality

### iOS Simulator

```bash
eas build --platform ios --profile preview --local
```

Or use Xcode simulator after local prebuild.

## 📊 Build Status

Check build status:

```bash
eas build:list
```

View specific build:

```bash
eas build:view [BUILD_ID]
```

## 🐛 Troubleshooting

### Build Fails

1. Check build logs: `eas build:view [BUILD_ID]`
2. Verify `app.json` configuration
3. Check dependencies in `package.json`
4. Ensure EAS CLI is up to date: `npm install -g eas-cli@latest`

### Plugin Errors

If you see plugin errors during prebuild:
- Use EAS build instead (handles plugins automatically)
- Or ensure all expo packages are compatible: `npx expo install --fix`

### iOS Code Signing Issues

1. Run: `eas credentials`
2. Select iOS platform
3. Choose "Set up new credentials"
4. Follow prompts

### Android Keystore Issues

EAS automatically manages keystores. If you need to:
- View credentials: `eas credentials`
- Generate new keystore: EAS will prompt on first build

## 📚 Additional Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Expo Config Plugins](https://docs.expo.dev/config-plugins/introduction/)
- [App Store Submission Guide](https://docs.expo.dev/submit/introduction/)
- [Google Play Submission Guide](https://docs.expo.dev/submit/android/)

## 🎯 Next Steps

1. ✅ Build preview APK/AAB
2. ✅ Test on physical devices
3. ✅ Configure production environment variables
4. ✅ Build production versions
5. ✅ Submit to app stores

Happy building! 🚀

