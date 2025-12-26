# Plugin Fix Guide

## Current Status

The Expo plugins (expo-location, expo-local-authentication, expo-secure-store) have build issues locally. They've been temporarily removed from `app.json` to allow the development server to start.

## What's Being Used

**expo-secure-store** is actually used in your code:
- `src/services/api.ts` - Token storage
- `src/services/authService.ts` - Authentication tokens

## Solutions

### Option 1: Use Expo Go (Recommended for Development)

Expo Go can run your app without native plugins being configured. The basic functionality will work.

**To start:**
```bash
npm start
# Scan QR code with Expo Go app
```

**Note:** Secure store functionality might not work in Expo Go. You can test other features.

### Option 2: Fix Plugins for Native Builds

For EAS builds (production), plugins work fine because they're resolved in the cloud. But for local development with native projects:

1. **Reinstall plugins:**
   ```bash
   cd apps/mobile-new
   npm uninstall expo-location expo-local-authentication expo-secure-store
   npm install expo-location expo-local-authentication expo-secure-store
   ```

2. **Or use EAS Build instead:**
   ```bash
   npm run build:android
   ```

### Option 3: Use Development Build

Create a development build with plugins:

```bash
# This will create a custom development client with plugins
eas build --profile development --platform android
```

Then install the development build on your device and run:
```bash
npm start -- --dev-client
```

## Adding Plugins Back

When you're ready to add plugins back to `app.json`:

```json
"plugins": [
  "expo-secure-store",  // Used in code
  "expo-local-authentication",  // Optional
  "expo-location"  // Optional
]
```

## Recommendation

- **Development/Testing:** Use Expo Go (no plugins needed) - `npm start`
- **Production:** Use EAS Build (plugins work automatically) - `npm run build:android`

The plugin issue doesn't affect EAS builds since they handle plugins in the cloud environment.

