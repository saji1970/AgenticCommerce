# Expo Go Guide - Run Your App Instantly

Expo Go is the easiest way to test your React Native app on your phone without building native apps.

## 📱 What is Expo Go?

Expo Go is a mobile app that lets you:
- Run your Expo app instantly on your phone
- See changes in real-time (hot reloading)
- Test without building native apps
- Share your app with others easily

## 🚀 Quick Start

### Step 1: Install Expo Go

Install the Expo Go app on your phone:

- **Android**: [Download from Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
- **iOS**: [Download from App Store](https://apps.apple.com/app/expo-go/id982107779)

### Step 2: Start Your Development Server

Open a terminal in your project:

```bash
cd apps/mobile-new
npm start
```

This will:
- Start the Metro bundler
- Open Expo DevTools in your browser
- Display a QR code

### Step 3: Connect Your Phone

**Option A: Scan QR Code (Recommended)**

1. Open **Expo Go** app on your phone
2. Tap **"Scan QR Code"** (usually the main button)
3. Scan the QR code shown in:
   - Your terminal window, OR
   - Your browser (if DevTools opened)

**Option B: Enter URL Manually**

1. In Expo Go, tap **"Enter URL manually"**
2. Enter the URL shown in your terminal (looks like: `exp://192.168.x.x:8081`)
3. Tap **Connect**

**Option C: Same WiFi Network**

- Make sure your phone and computer are on the same WiFi network
- Expo Go should automatically discover your app (sometimes)

### Step 4: App Loads!

Your app will download and load on your phone! 🎉

## 📋 Common Workflows

### Starting Fresh

```bash
cd apps/mobile-new
npm start
```

### Clearing Cache (if issues)

```bash
npm start -- --clear
```

### Using Specific Port

```bash
npm start -- --port 8081
```

### Opening on Specific Platform

While `npm start` is running, you can:

- Press `a` - Open on Android emulator
- Press `i` - Open on iOS simulator (macOS only)
- Press `w` - Open in web browser
- Press `r` - Reload the app
- Press `m` - Toggle menu

## 🔧 Troubleshooting

### "Unable to connect to Expo"

**Solution 1: Check WiFi Connection**
- Ensure phone and computer are on the same WiFi network
- Try turning WiFi off and on

**Solution 2: Use Tunnel Mode**
```bash
npm start -- --tunnel
```
This uses Expo's servers to tunnel the connection (works across networks, but slower)

**Solution 3: Check Firewall**
- Ensure your firewall allows connections on port 8081
- Try temporarily disabling firewall to test

### QR Code Not Scanning

**Solution 1: Use URL Manually**
- Copy the URL from terminal (exp://...)
- Open Expo Go → "Enter URL manually"
- Paste the URL

**Solution 2: Check Terminal Window**
- Make sure QR code is fully visible
- Try resizing terminal window
- QR code is also shown in browser DevTools

### App Not Loading

**Solution 1: Reload App**
- Shake your phone (or press `r` in terminal)
- Tap "Reload" in the developer menu

**Solution 2: Clear Cache**
```bash
npm start -- --clear
```

**Solution 3: Restart Everything**
1. Close Expo Go app
2. Stop the server (Ctrl+C)
3. Restart: `npm start`
4. Scan QR code again

### "Network Request Failed"

This usually means:
- Your API URL in `src/config/api.ts` points to `localhost`
- `localhost` on your phone refers to the phone itself, not your computer

**Fix: Use Your Computer's IP Address**

1. Find your computer's local IP:
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` or `ip addr`
   
2. Update `src/config/api.ts`:
   ```typescript
   // Change from:
   const LOCAL_API_URL = 'http://localhost:3000/api/v1';
   
   // To (use your actual IP):
   const LOCAL_API_URL = 'http://192.168.1.100:3000/api/v1';
   ```

3. Restart the server: `npm start -- --clear`

## 📱 Expo Go Features

### Developer Menu

Shake your device (or press `r` in terminal) to open developer menu:
- **Reload** - Reload the app
- **Debug Remote JS** - Debug in Chrome DevTools
- **Show Perf Monitor** - Show performance metrics
- **Element Inspector** - Inspect UI elements

### Hot Reloading

Changes to your code automatically reload:
- Save a file → See changes instantly
- No need to rebuild or restart
- Very fast development cycle

### Logs

View logs in:
- Terminal where `npm start` is running
- Expo DevTools in browser
- Device console (shake device → Show Device Logs)

## ⚠️ Limitations

### Native Modules

Some features **won't work** in Expo Go:
- Custom native code
- Some Expo plugins (may need development build)
- Native modules not included in Expo Go

### Current Status

With plugins removed from `app.json`, your app should work in Expo Go, but:
- `expo-secure-store` might not work (token storage)
- Other native features might be limited

For full functionality, use:
- **Development Build** (custom Expo client with your plugins)
- **Production Build** (full native app)

## 🎯 Best Practices

### Development Workflow

1. **Start with Expo Go** - Fastest way to test UI and navigation
2. **Use Development Build** - For testing native features
3. **Build Production** - For final testing and release

### Sharing Your App

**With Expo Go:**
1. Start server: `npm start`
2. Share the QR code or URL
3. Others scan with Expo Go
4. They can see your app instantly!

**Note:** Others need to be on same WiFi, or use tunnel mode:
```bash
npm start -- --tunnel
```

## 🔄 Switching Between Expo Go and Native Builds

### Using Expo Go (Current)
```bash
npm start
# Scan QR code
```

### Using Development Build
```bash
# First, build development client
eas build --profile development --platform android

# Then run with dev client
npm start -- --dev-client
```

### Using Production Build
```bash
npm run build:android
# Install APK from build link
```

## 📚 Additional Resources

- [Expo Go Documentation](https://docs.expo.dev/get-started/expo-go/)
- [Expo DevTools](https://docs.expo.dev/workflow/developer-tools/)
- [Troubleshooting Guide](https://docs.expo.dev/troubleshooting/clear-cache/)

## 🎉 You're Ready!

Start your server and scan the QR code with Expo Go:

```bash
cd apps/mobile-new
npm start
```

Happy coding! 🚀

