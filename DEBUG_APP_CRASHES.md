# Debugging App Crashes

## Getting React Native/Expo Crash Logs

The Android system logs you showed don't contain app-specific errors. To debug React Native crashes, you need to filter for app-specific logs.

### Method 1: Using ADB Logcat (Recommended)

Filter for React Native and Expo logs:

```bash
# Filter for React Native logs
adb logcat | grep -i "ReactNative\|Expo\|com.agentic"

# Or filter for your app package name
adb logcat | grep "com.agentic"

# Filter for JavaScript errors
adb logcat | grep -i "error\|exception\|crash" | grep -i "react\|expo"
```

### Method 2: Using Expo CLI

If running with Expo:

```bash
# Start Expo with verbose logging
npx expo start --dev-client

# Or check Metro bundler logs
npx expo start --clear
```

### Method 3: Check Metro Bundler Console

The Metro bundler console in your terminal will show JavaScript errors and warnings.

### Method 4: Enable Remote Debugging

1. Shake device or press `Ctrl+M` (Android emulator)
2. Select "Debug" or "Open Dev Menu"
3. Enable "Debug JS Remotely"
4. Open Chrome DevTools at `chrome://inspect`
5. Check Console tab for errors

### Method 5: Check Device Logs in Android Studio

1. Open Android Studio
2. Connect device/emulator
3. Go to View → Tool Windows → Logcat
4. Filter by package name: `com.agentic`
5. Look for red error messages

## Common Crash Causes

### 1. Undefined Product Price
- **Fixed**: Added null checks for `product.price`
- **Symptoms**: App crashes when displaying price
- **Solution**: Already implemented in latest code

### 2. Missing Mandate Context
- **Symptoms**: `getActiveMandateByType` returns undefined
- **Solution**: Added error handling and logging

### 3. Invalid Product Data
- **Symptoms**: Product object is null or missing required fields
- **Solution**: Added validation in button handlers

### 4. Network Errors
- **Symptoms**: API calls fail
- **Solution**: Error handling with user-friendly messages

## Testing the Fixes

After pulling the latest code:

1. **Rebuild the app**:
   ```bash
   cd apps/mobile
   npx expo run:android
   ```

2. **Test Buy Button**:
   - Navigate to a product
   - Click "Buy Now"
   - Check console for `[BuyButton]` logs
   - If it crashes, the logs will show where

3. **Test Intent Button**:
   - Navigate to a product
   - Click "Create Intent"
   - Check console for `[IntentButton]` logs
   - If it crashes, the logs will show where

## Getting Specific Error Logs

If the app still crashes, run this command to capture all relevant logs:

```bash
# Clear logcat and capture new logs
adb logcat -c
adb logcat | tee crash-log.txt

# Then reproduce the crash and stop logging (Ctrl+C)
# The crash-log.txt file will contain all logs
```

Then filter the log file:

```bash
# Filter for errors
grep -i "error\|exception\|fatal\|crash" crash-log.txt

# Filter for React Native
grep -i "react\|expo\|javascript" crash-log.txt
```

## What to Look For

1. **JavaScript Errors**: Look for `Error:`, `TypeError:`, `ReferenceError:`
2. **Stack Traces**: Lines starting with `at` showing function calls
3. **Component Errors**: Errors mentioning component names like `BuyButton`, `IntentButton`
4. **Red Screen of Death**: React Native error overlay - check Metro bundler console

## Next Steps

If you're still experiencing crashes:

1. Capture the logs using Method 1 or Method 5 above
2. Look for lines containing:
   - Your app's package name
   - "ReactNative"
   - "Expo"
   - "Error" or "Exception"
3. Share the filtered logs so we can identify the exact issue
