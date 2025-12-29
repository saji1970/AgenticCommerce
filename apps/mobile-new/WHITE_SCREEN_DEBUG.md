# White Screen Debug Guide

## Common Causes of White Screen

### 1. Check Error Boundary

The app has an ErrorBoundary that should catch errors. If you see a white screen:
- Shake your device → Check if error message appears
- Check terminal logs for errors
- Look for red error screens

### 2. Check Terminal/Console Logs

Run the app and check terminal output:

```bash
npm start
```

Look for:
- Red error messages
- Module not found errors
- Import errors
- Syntax errors

### 3. Common Issues Fixed

**Issue: ErrorBoundary using wrong Button component**
- ✅ Fixed: Changed from `react-native` Button to `react-native-paper` Button

**Issue: SecureStore not available**
- ✅ Fixed: Added storage utility with AsyncStorage fallback

### 4. Debug Steps

#### Step 1: Clear Cache and Restart

```bash
npm start -- --clear
```

#### Step 2: Check for Errors

1. **In Terminal:**
   - Look for red error messages
   - Check for "Cannot find module" errors
   - Look for syntax errors

2. **In Expo Go:**
   - Shake device → Open developer menu
   - Tap "Show Device Logs"
   - Look for error messages

3. **In Browser DevTools:**
   - Open Expo DevTools (usually opens automatically)
   - Check Console tab for errors

#### Step 3: Test Individual Components

Try simplifying the app to isolate the issue:

1. **Test Basic App (temporarily modify App.tsx):**

```typescript
export default function App() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Hello World</Text>
    </View>
  );
}
```

If this works, the issue is in one of the providers or navigation.

2. **Test with Providers:**

Add providers one by one to find which one causes the issue.

#### Step 4: Check Dependencies

Ensure all dependencies are installed:

```bash
npm install
```

### 5. Most Likely Issues

Based on the code, here are potential issues:

#### Navigation Error
- Check if all screens are properly exported
- Verify navigation structure

#### Redux Store Error
- Check if all slices are properly configured
- Verify initial state in slices

#### Missing Dependencies
- Check if all packages are installed
- Verify version compatibility

### 6. Quick Fixes to Try

#### Fix 1: Add Gesture Handler Import

Add to the top of `App.tsx`:

```typescript
import 'react-native-gesture-handler';
```

#### Fix 2: Simplify Initial Route

In `RootNavigator.tsx`, try changing initial route:

```typescript
initialRouteName="Login"  // Instead of "Main"
```

#### Fix 3: Wrap Navigation in Try-Catch

Add error handling in navigation.

### 7. Enable Debugging

#### Enable Remote Debugging

1. Shake device → "Debug Remote JS"
2. Opens Chrome DevTools
3. Check Console for errors

#### Add Console Logs

Add to `App.tsx`:

```typescript
export default function App() {
  console.log('App rendering...');
  return (
    // ... existing code
  );
}
```

### 8. Check These Files

Verify these files exist and are correct:
- ✅ `App.tsx` - Root component
- ✅ `index.ts` - Entry point
- ✅ `src/navigation/RootNavigator.tsx` - Navigation setup
- ✅ `src/store/index.ts` - Redux store
- ✅ All screen files in `src/screens/`

### 9. If Still White Screen

#### Option 1: Check Metro Bundler

Look at Metro bundler output for errors:
- Syntax errors
- Module resolution errors
- Type errors

#### Option 2: Check Device Logs

```bash
# Android
adb logcat | grep -i error

# Or in Expo Go
Shake device → Show Device Logs
```

#### Option 3: Minimal Test

Create a minimal test app:

```typescript
// App.tsx - Minimal version
import React from 'react';
import { View, Text } from 'react-native';

export default function App() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Test App</Text>
    </View>
  );
}
```

If this works, gradually add components back.

### 10. Get Help

If still having issues, collect:
1. Terminal error output
2. Device logs
3. Screenshot of white screen
4. Steps to reproduce

Then share these details for further debugging.



