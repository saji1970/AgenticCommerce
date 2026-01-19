# EAS Android Build Guide

This guide covers building Android APKs for the AgenticCommerce mobile app using Expo Application Services (EAS).

## Prerequisites

1. **Expo Account**: Sign up at https://expo.dev
2. **EAS CLI**: Install globally
   ```bash
   npm install -g eas-cli
   ```
3. **Login to EAS**:
   ```bash
   eas login
   ```

## Project Structure

- **AgenticCommerce Mobile App**: `apps/mobile/` - This is the mobile app that needs EAS builds
- **Mandate Service**: `apps/mandate-service/` - Backend service (deployed on Railway, no EAS build needed)

## Build Profiles

The EAS configuration (`apps/mobile/eas.json`) includes three profiles:

### 1. Development Build
- **Profile**: `development`
- **Purpose**: For development with dev client
- **Distribution**: Internal
- **Build Type**: APK
- **Command**: 
  ```bash
  cd apps/mobile
  eas build --platform android --profile development
  ```

### 2. Preview Build
- **Profile**: `preview`
- **Purpose**: For testing and internal distribution
- **Distribution**: Internal
- **Build Type**: APK
- **Command**:
  ```bash
  cd apps/mobile
  eas build --platform android --profile preview
  ```

### 3. Production Build
- **Profile**: `production`
- **Purpose**: For production release
- **Distribution**: Play Store ready
- **Build Type**: APK (or AAB for Play Store)
- **Auto-increment**: Enabled
- **Command**:
  ```bash
  cd apps/mobile
  eas build --platform android --profile production
  ```

## Building Android APKs

### Quick Start

1. **Navigate to mobile app directory**:
   ```bash
   cd apps/mobile
   ```

2. **Build for specific profile**:
   ```bash
   # Development build
   pnpm run build:android:dev
   # OR
   eas build --platform android --profile development

   # Preview build
   pnpm run build:android:preview
   # OR
   eas build --platform android --profile preview

   # Production build
   pnpm run build:android:prod
   # OR
   eas build --platform android --profile production
   ```

### Build Options

#### Local Build (Faster, but requires Android SDK)
```bash
cd apps/mobile
pnpm run build:android:local
```

#### EAS Cloud Build (Recommended)
```bash
cd apps/mobile
eas build --platform android --profile production
```

### Build with Specific Options

```bash
# Build APK (not AAB)
eas build --platform android --profile production --type apk

# Build AAB for Play Store
eas build --platform android --profile production --type app-bundle

# Build for specific channel
eas build --platform android --profile production --channel production
```

## Environment Variables

The app uses these environment variables (configured in code):
- `__DEV__` - Automatically set by Expo
- Backend URLs are configured in `apps/mobile/src/services/api.ts` and `apps/mobile/src/services/mandate-service.client.ts`

### Production URLs:
- **Backend API**: `https://agenticcommerce-production.up.railway.app/api`
- **Mandate Service**: `https://pure-wonder-production.up.railway.app/api`

## Build Process

1. **EAS CLI** uploads your code to Expo's build servers
2. **Build servers** compile the Android app
3. **Download link** is provided when build completes
4. **Install APK** on Android device or emulator

## Monitoring Builds

### View Build Status
```bash
eas build:list
```

### View Specific Build
```bash
eas build:view [BUILD_ID]
```

### Download Build
Builds are automatically available at:
- Expo Dashboard: https://expo.dev/accounts/sajipillai1970/projects/agentic-commerce/builds
- Direct download link provided after build completes

## Troubleshooting

### Build Fails

1. **Check EAS status**: https://status.expo.dev
2. **View build logs**: 
   ```bash
   eas build:view [BUILD_ID]
   ```
3. **Common issues**:
   - Missing dependencies: Run `pnpm install` in `apps/mobile`
   - TypeScript errors: Run `pnpm run type-check`
   - EAS project not linked: Run `eas init` in `apps/mobile`

### App Crashes After Install

1. **Check device compatibility**: Android 6.0+ required
2. **Enable unknown sources**: Settings → Security → Unknown Sources
3. **Check logs**: 
   ```bash
   adb logcat | grep -i "agentic"
   ```

## Mandate Service (Backend)

The mandate-service is a **backend service** (Node.js/Express) and does **NOT** need an EAS build. It's deployed on Railway:

- **URL**: https://pure-wonder-production.up.railway.app
- **Admin UI**: https://pure-wonder-production.up.railway.app/admin
- **API**: https://pure-wonder-production.up.railway.app/api

### Backend Deployment

The mandate-service is automatically deployed on Railway when you push to the `master` branch. No EAS build needed.

## Complete Build Workflow

### For Development:
```bash
cd apps/mobile
eas build --platform android --profile development
```

### For Testing:
```bash
cd apps/mobile
eas build --platform android --profile preview
```

### For Production:
```bash
cd apps/mobile
eas build --platform android --profile production
```

## Build Scripts Reference

All build scripts are in `apps/mobile/package.json`:

- `build:android:dev` - Development build
- `build:android:preview` - Preview build  
- `build:android:prod` - Production build
- `build:android:local` - Local build (requires Android SDK)

## Next Steps

1. **Build the app**:
   ```bash
   cd apps/mobile
   eas build --platform android --profile production
   ```

2. **Wait for build** (usually 10-20 minutes)

3. **Download APK** from Expo dashboard or build completion email

4. **Install on device**:
   ```bash
   adb install path/to/app.apk
   ```

5. **Test the app** with:
   - Backend API: https://agenticcommerce-production.up.railway.app
   - Mandate Service: https://pure-wonder-production.up.railway.app

## Notes

- **Mandate Service** is a backend service, not a mobile app
- Only the **AgenticCommerce mobile app** needs EAS builds
- Backend services are deployed on Railway, not via EAS
- EAS builds are for React Native/Expo mobile apps only
