# Quick Build Guide

Build Android and iOS apps in minutes!

## ⚡ Fastest Way (EAS Build - Cloud)

### Prerequisites (2 minutes)

1. **Install EAS CLI**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo** (create free account at https://expo.dev)
   ```bash
   eas login
   ```

3. **Configure project** (one-time setup)
   ```bash
   eas build:configure
   ```

### Build Commands

**Android APK (for testing):**
```bash
npm run build:android
```

**iOS App (for testing):**
```bash
npm run build:ios
```

**Production builds (for app stores):**
```bash
npm run build:android:production  # Creates AAB for Google Play
npm run build:ios:production      # Creates IPA for App Store
```

**Build both platforms:**
```bash
npm run build:all
```

### What Happens?

1. EAS uploads your code to cloud build servers
2. Native Android/iOS projects are generated automatically
3. Apps are built with all dependencies
4. You get a download link (usually 10-15 minutes)

### Using Build Scripts (Windows)

Double-click to run:
- `build-android.bat` - Build Android APK
- `build-ios.bat` - Build iOS app  
- `build-production.bat` - Build both for production

## 📱 Installing Builds

### Android APK

1. Download APK from the build link
2. Enable "Install from unknown sources" on Android device
3. Transfer and install APK

### iOS (TestFlight)

1. Build automatically uploads to App Store Connect
2. Add testers in TestFlight
3. Testers get email invitation

## 🔧 Configuration

### Update API URL

Edit `src/config/api.ts`:

```typescript
const RAILWAY_API_URL = 'https://your-app.railway.app/api/v1';
```

### App Details

Edit `app.json`:
- App name
- Bundle ID / Package name
- Version
- Icons

## 🎯 Next Steps

1. ✅ Build preview APK: `npm run build:android`
2. ✅ Test on device
3. ✅ Update API URL in config
4. ✅ Build production: `npm run build:android:production`
5. ✅ Submit to app stores

## 📚 Full Documentation

See [BUILD_GUIDE.md](./BUILD_GUIDE.md) for:
- Local builds
- Troubleshooting
- App store submission
- Advanced configuration

---

**Ready to build?** Run: `npm run build:android` 🚀

