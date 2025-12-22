# Quick Start: Open Agentic Commerce in Android Studio

## ⚡ Fast Track Instructions

### Prerequisites
- ✅ Android Studio installed
- ✅ USB debugging enabled on your Android phone (or Android emulator set up)

### Steps

1. **Open Android Studio**
   - Launch Android Studio application

2. **Open the Project**
   - Click **"Open"** on the welcome screen
   - Navigate to: `C:\AgenticCommerce\apps\mobile\android`
   - Click **OK**

3. **Wait for Gradle Sync**
   - This will take 5-10 minutes the first time
   - Watch the bottom status bar for "Gradle Build" progress
   - Wait until you see "Gradle sync finished" ✅

4. **Connect Your Device**
   - Connect your Android phone via USB
   - Or start an Android emulator from **Tools > Device Manager**

5. **Run the App**
   - Click the green **Run** button (▶️) at the top
   - Or press **Shift + F10**
   - Select your device from the list
   - Wait for the build to complete (~3-5 minutes first time)

6. **App Launches!**
   - The "Agentic Commerce" app will install and open on your device

---

## 🎯 Direct APK Installation (No Android Studio)

If you just want to install the app without Android Studio:

### Step 1: Locate the APK
The debug APK has been built at:
```
C:\AgenticCommerce\apps\mobile\android\app\build\outputs\apk\debug\app-debug.apk
```

### Step 2: Install on Your Phone

**Method A: USB Transfer**
1. Copy `app-debug.apk` to your phone's Downloads folder
2. On your phone, open **Files** app
3. Navigate to Downloads
4. Tap on `app-debug.apk`
5. Allow installation from unknown sources if prompted
6. Tap **Install**

**Method B: ADB Install**
```bash
adb install "C:\AgenticCommerce\apps\mobile\android\app\build\outputs\apk\debug\app-debug.apk"
```

---

## 📱 Important: Backend Configuration

Before the app works, you need to:

1. **Start the Backend Server**
   ```bash
   cd C:\AgenticCommerce\apps\backend
   npm run dev
   ```

2. **Update API URL in App**

   The app needs to know where to find your backend API.

   **For Android Emulator**: Use `10.0.2.2:3000`
   **For Physical Device**: Use your computer's IP (e.g., `192.168.1.100:3000`)

   Find your computer's IP:
   ```bash
   ipconfig
   ```
   Look for "IPv4 Address" under your active network adapter.

---

## 🔧 Troubleshooting

### "Gradle Sync Failed"
```bash
cd C:\AgenticCommerce\apps\mobile\android
.\gradlew clean
```
Then reopen in Android Studio.

### "No Device Found"
- Make sure USB debugging is enabled on your phone
- Try different USB cable
- Run `adb devices` to verify device is detected

### "App Crashes on Startup"
- Make sure backend server is running
- Check API URL configuration
- View Logcat in Android Studio for error details

---

## 📂 Project Locations

- **Android Project**: `C:\AgenticCommerce\apps\mobile\android\`
- **Source Code**: `C:\AgenticCommerce\apps\mobile\src\`
- **APK Output**: `C:\AgenticCommerce\apps\mobile\android\app\build\outputs\apk\`
- **Full Guide**: `C:\AgenticCommerce\ANDROID_BUILD_GUIDE.md`

---

## 🎉 You're Ready!

Your Android app is ready to run. Follow the steps above and you'll have Agentic Commerce running on your Android device in minutes!

For detailed instructions, see **ANDROID_BUILD_GUIDE.md**.
