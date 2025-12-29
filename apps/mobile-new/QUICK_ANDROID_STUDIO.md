# Quick Android Studio Build & Deploy

## ✅ Build Complete!

Your APK has been built successfully:
- **Location:** `android/app/build/outputs/apk/debug/app-debug.apk`

## 🚀 Quick Deploy Options

### Option 1: Deploy with Batch Script (Easiest)

1. **Double-click:** `deploy-android-studio.bat`
   - Builds APK (if needed)
   - Installs on connected device automatically

2. **Or build only:** `build-android-studio.bat`

### Option 2: Open in Android Studio

1. **Double-click:** `open-android-studio.bat`
   - Opens the project in Android Studio

2. **Wait for Gradle Sync** (first time: 5-10 minutes)

3. **Connect Android Device:**
   - Enable USB Debugging on device
   - Connect via USB
   - Accept debugging prompt on device

4. **Run:**
   - Click the **Run** button (green play icon)
   - Select your device
   - App builds and installs automatically

### Option 3: Manual ADB Install

```bash
cd android
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## 📱 Verify Device Connection

```bash
adb devices
```

Should show your device like:
```
List of devices attached
ABC123XYZ    device
```

## 🐛 If App Crashes

1. **Check Logcat in Android Studio:**
   - View > Tool Windows > Logcat
   - Filter by: `com.sajipillai70.agenticcommerce`

2. **Or use ADB:**
   ```bash
   adb logcat | grep -i agenticcommerce
   ```

3. **Common Issues:**
   - API connection: Verify Railway backend is accessible
   - Permissions: Check AndroidManifest.xml
   - Storage: Check if SecureStore/AsyncStorage is working

## 📋 What Was Built

- **Package:** `com.sajipillai70.agenticcommerce`
- **Build Type:** Debug
- **API Backend:** `https://agenticcommerce-production.up.railway.app`
- **Build Time:** ~4-5 minutes
- **APK Size:** Check the file size in Windows Explorer

## ✅ Next Steps

1. ✅ Build successful
2. ⏳ Deploy to device
3. ⏳ Test app functionality
4. ⏳ Check API connection
5. ⏳ Create release build (for distribution)

---

**Ready to deploy?** Run `deploy-android-studio.bat` or open in Android Studio! 🎉


