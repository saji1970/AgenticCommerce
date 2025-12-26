# Deploy in Android Studio - Complete Guide

## Step 1: Setup ADB Reverse (Option 2) ✅

ADB reverse port forwarding is now configured. This allows the emulator to connect to Metro using `localhost:8081`.

### Verify Setup:

```bash
adb reverse tcp:8081 tcp:8081
```

Should show no errors if device/emulator is connected.

## Step 2: Start Metro Bundler

**Metro must be running before deploying!**

### Option A: Use Script
- Double-click: `apps/mobile/run-app.bat`
- Or: `apps/mobile/start-metro.bat`

### Option B: Manual
```bash
cd C:\AgenticCommerce\apps\mobile
npx expo start
```

**Wait for**: `Metro waiting on exp://...`

## Step 3: Deploy in Android Studio

### 3.1 Open Project

1. **Launch Android Studio**
2. **File > Open**
3. Navigate to: `C:\AgenticCommerce\apps\mobile\android`
4. Click **OK**

### 3.2 Wait for Gradle Sync

- Android Studio will sync Gradle automatically
- First time: 5-10 minutes
- Watch bottom status bar for progress
- If sync fails, check **Build** tab for errors

### 3.3 Connect Device/Emulator

**For Emulator:**
- **Tools > Device Manager**
- Click **Play** button on an emulator
- Wait for emulator to fully boot

**For Physical Device:**
- Enable **USB Debugging** (Settings > Developer Options)
- Connect via USB
- Allow USB debugging when prompted

### 3.4 Verify Device is Connected

In Android Studio:
- Check **Device Manager** (top toolbar)
- Your device/emulator should appear in the dropdown

### 3.5 Run the App

1. **Select your device** from dropdown (top toolbar)
2. **Click Run button** (▶️ green play icon) or press **Shift + F10**
3. **Wait for build and installation** (2-5 minutes)
4. **App should launch automatically!**

## Step 4: Monitor Deployment

### Build Output

Watch the **Build** tab at bottom:
- ✅ **BUILD SUCCESSFUL** - Build completed
- ❌ **BUILD FAILED** - Check error messages

### Logcat (Runtime Logs)

1. Open **Logcat** tab (bottom)
2. Filter by: `com.agenticcommerce.app`
3. Watch for:
   - App starting
   - Metro connection
   - Any errors

### Metro Connection

In Metro terminal, you should see:
- Connection requests from device
- Bundle requests
- `Bundling...` messages
- `Bundled in Xms` when bundle is created

## Troubleshooting

### Issue: "Device not found"

**Fix:**
```bash
adb devices
```

Should show your device. If not:
- For emulator: Start emulator first
- For physical: Enable USB debugging, check cable

### Issue: "Metro connection refused"

**Fix:**
1. Verify Metro is running (check terminal)
2. Verify ADB reverse is set:
   ```bash
   adb reverse tcp:8081 tcp:8081
   ```
3. Restart Metro: `npx expo start --clear`

### Issue: "Build failed"

**Fix:**
1. Check **Build** tab for specific error
2. Common fixes:
   - **Sync Gradle**: File > Sync Project with Gradle Files
   - **Clean build**: Build > Clean Project
   - **Rebuild**: Build > Rebuild Project

### Issue: "App crashes on launch"

**Fix:**
1. Check **Logcat** for error messages
2. Verify Metro is running
3. Clear app data: Settings > Apps > Your App > Clear Data
4. Reinstall app

## Quick Checklist

Before deploying:
- [ ] Metro bundler running (`npx expo start`)
- [ ] ADB reverse configured (`adb reverse tcp:8081 tcp:8081`)
- [ ] Device/emulator connected and visible in Android Studio
- [ ] Gradle sync completed successfully
- [ ] Build variant set to **debug** (for Metro connection)

## Deployment Steps Summary

1. ✅ **ADB reverse**: `adb reverse tcp:8081 tcp:8081` (DONE)
2. **Start Metro**: `npx expo start` (in separate terminal)
3. **Open Android Studio**: File > Open > `apps/mobile/android`
4. **Wait for Gradle sync**
5. **Select device** from dropdown
6. **Click Run** (▶️)
7. **App deploys and launches!**

## Success Indicators

✅ **Deployment successful when**:
- Build completes without errors
- App installs on device/emulator
- App launches automatically
- Metro shows connection logs
- App UI displays (no white screen)
- No "Unable to load script" error

## Next Steps After Deployment

- **Hot Reload**: Press `R` twice in Metro terminal to reload
- **Dev Menu**: Shake device or press `Ctrl+M` (emulator)
- **View Logs**: Check Logcat tab in Android Studio
- **Debug**: Set breakpoints in Android Studio

---

**You're all set!** ADB reverse is configured. Just start Metro and run from Android Studio! 🚀

