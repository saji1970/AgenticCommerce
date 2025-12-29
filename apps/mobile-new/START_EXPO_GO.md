# How to Start Expo Go - Step by Step

## 📱 Quick Start Guide

### Step 1: Install Expo Go on Your Phone

**Android:**
- Open Google Play Store
- Search for "Expo Go"
- Install the app (by Expo)

**iOS:**
- Open App Store
- Search for "Expo Go"
- Install the app (by Expo)

### Step 2: Start the Development Server

Open a terminal and run:

```bash
cd apps/mobile-new
npm start
```

Or use the batch script:
- Double-click: `start-expo-go.bat`

This will:
- Start Metro bundler
- Show a QR code in your terminal
- Open Expo DevTools in your browser

### Step 3: Connect Your Phone

**Make sure your phone and computer are on the same WiFi network!**

**Option A: Scan QR Code (Easiest)**

1. Open **Expo Go** app on your phone
2. Tap **"Scan QR Code"** (main button)
3. Scan the QR code from:
   - Your terminal window, OR
   - Browser window (Expo DevTools)

**Option B: Enter URL Manually**

1. In Expo Go, tap **"Enter URL manually"**
2. Copy the URL from terminal (looks like: `exp://192.168.x.x:8081`)
3. Paste and tap **Connect**

**Option C: Use Tunnel Mode (if not on same WiFi)**

If your phone and computer are on different networks:

```bash
npm start -- --tunnel
```

Then scan the QR code. This uses Expo's servers (works anywhere, but slower).

### Step 4: App Loads!

Your app will download and appear on your phone! 🎉

## 🎯 What You'll See

When you run `npm start`, you'll see:

```
Metro waiting on exp://192.168.x.x:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Press a │ open Android
› Press i │ open iOS simulator  
› Press w │ open web

› Press r │ reload app
› Press m │ toggle menu
```

## 📋 Complete Commands

### Start Server (Standard)
```bash
cd apps/mobile-new
npm start
```

### Start with Cleared Cache (if issues)
```bash
npm start -- --clear
```

### Start with Tunnel (different WiFi networks)
```bash
npm start -- --tunnel
```

### Start on Specific Port
```bash
npm start -- --port 8081
```

## 🔧 Troubleshooting

### Can't Connect to Server?

**Problem:** "Unable to connect to Expo"

**Solutions:**
1. **Check WiFi** - Phone and computer must be on same network
2. **Try tunnel mode:**
   ```bash
   npm start -- --tunnel
   ```
3. **Check firewall** - Allow port 8081
4. **Try manual URL** - Copy URL from terminal and enter manually in Expo Go

### QR Code Not Scanning?

**Solutions:**
1. Make terminal window larger so QR code is clear
2. Try scanning from browser (Expo DevTools)
3. Use manual URL entry in Expo Go

### App Not Loading?

**Solutions:**
1. **Reload app:**
   - Shake phone → Tap "Reload"
   - Or press `r` in terminal

2. **Clear cache and restart:**
   ```bash
   npm start -- --clear
   ```

3. **Check for errors:**
   - Look at terminal for error messages
   - Check browser DevTools console

### API Not Working?

**Problem:** Network errors or API calls failing

**Solution:** Update API URL in `src/config/api.ts`:

```typescript
// Change from localhost to your computer's IP:
const LOCAL_API_URL = 'http://192.168.1.100:3000/api/v1';
//                                    ^^^^ Use your actual IP
```

To find your IP:
- Windows: Run `ipconfig` and look for "IPv4 Address"
- Mac/Linux: Run `ifconfig` or `ip addr`

## 💡 Tips

### Fast Reloading
- Save files → Changes appear instantly on phone
- No need to rebuild or restart

### Developer Menu
- Shake phone to open menu
- Options: Reload, Debug, Performance Monitor, etc.

### Logs
- View logs in terminal where `npm start` is running
- Or in browser DevTools
- Or shake device → "Show Device Logs"

### Sharing with Others
1. Start server: `npm start`
2. Share QR code or URL
3. Others scan with Expo Go
4. They see your app instantly!

**Note:** Others need same WiFi OR use tunnel mode

## 🚀 Quick Reference

| Task | Command |
|------|---------|
| Start server | `npm start` |
| Clear cache | `npm start -- --clear` |
| Tunnel mode | `npm start -- --tunnel` |
| Reload app | Press `r` in terminal |
| Open menu | Press `m` in terminal |

## ✅ Checklist

- [ ] Expo Go installed on phone
- [ ] Phone and computer on same WiFi
- [ ] Run `npm start` in project directory
- [ ] Scan QR code with Expo Go
- [ ] App loads on phone!

## 🎉 You're Ready!

Start now:

```bash
cd apps/mobile-new
npm start
```

Then scan the QR code with Expo Go! 🚀



