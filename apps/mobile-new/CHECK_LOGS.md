# How to Check Logs for White Screen Issue

## 🔍 Check These Places for Errors

### 1. Terminal Where `npm start` is Running

Look for:
- ❌ Red error messages
- ❌ "Cannot find module" errors
- ❌ Import errors
- ❌ Syntax errors
- ❌ TypeScript errors

**What to look for:**
```
ERROR  Unable to resolve module...
ERROR  Cannot find module...
ERROR  SyntaxError...
TypeError...
```

### 2. Expo DevTools Browser Console

1. When you run `npm start`, a browser window should open
2. Open **Developer Tools** (F12)
3. Check the **Console** tab
4. Look for red error messages

### 3. Device Logs in Expo Go

**On Your Phone:**
1. Shake your device
2. Tap **"Show Device Logs"**
3. Scroll through logs looking for errors

**Or in Terminal:**
- Look for logs that appear when app loads

### 4. Error Boundary Screen

If ErrorBoundary catches an error:
- You'll see "Something went wrong!" screen
- Error details will be shown
- Tap "Try Again" button

### 5. Common Error Patterns to Look For

#### Module Not Found
```
ERROR  Unable to resolve module './SomeFile'
```
**Fix:** Check file paths and imports

#### Import Error
```
ERROR  The module '@react-navigation/native' could not be found
```
**Fix:** Run `npm install`

#### Syntax Error
```
ERROR  SyntaxError: Unexpected token
```
**Fix:** Check file for syntax mistakes

#### Type Error
```
TypeError: Cannot read property 'something' of undefined
```
**Fix:** Check if objects exist before accessing properties

### 6. Quick Debug Steps

#### Step 1: Check Terminal Output

```bash
cd apps/mobile-new
npm start -- --clear
```

Watch for errors as the app starts.

#### Step 2: Add Console Logs

The app now has console.log in App.tsx:
```typescript
console.log('App component rendering...');
```

If you see this log but still white screen, the issue is after App renders.

#### Step 3: Check Each Provider

The app wraps components in multiple providers. To test which one might be failing, you can temporarily simplify:

```typescript
// Temporarily test without providers
export default function App() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Test</Text>
    </View>
  );
}
```

If this works, add providers back one by one.

### 7. What I Fixed

✅ **ErrorBoundary Button** - Changed from `react-native` Button to `react-native-paper` Button
✅ **Gesture Handler** - Added import at top of App.tsx
✅ **Debug Logging** - Added console.log to track rendering

### 8. Next Steps

1. **Clear cache and restart:**
   ```bash
   npm start -- --clear
   ```

2. **Watch terminal output** for errors

3. **Check browser console** (DevTools)

4. **Shake device** → Check device logs

5. **Share the error message** you see - copy the exact error text from terminal/console

### 9. Share Error Details

If you find an error, share:
1. The **exact error message** from terminal
2. The **file name** where error occurs (if shown)
3. The **stack trace** (if shown)
4. Any **warnings** before the error

This will help identify the exact issue!



