# Railway API Connection Status

## Current Configuration

The app is configured to use Railway backend:

**API URL:** `https://agenticcommerce-production.up.railway.app/api/v1`

**Configuration File:** `src/config/api.ts`

## Two Different Connections

### 1. Metro Bundler Connection (JavaScript Bundle)
- **Problem:** App can't load JavaScript bundle
- **Status:** ❌ Not connected (Metro not running or not accessible)
- **Fix:** Run Metro bundler and ensure port forwarding is set up

### 2. Railway API Connection (Backend)
- **Problem:** App can't make API calls to Railway backend
- **Status:** ⚠️ Unknown (app hasn't loaded yet)
- **Fix:** Once app loads, API calls will automatically use Railway URL

## Testing Railway Connection

### From Computer:
```bash
# Test if Railway is accessible
curl https://agenticcommerce-production.up.railway.app/api/v1

# Or in PowerShell:
Invoke-WebRequest -Uri "https://agenticcommerce-production.up.railway.app/api/v1" -UseBasicParsing
```

### From App (after it loads):

The app will automatically use Railway when making API calls:
- Login: `POST https://agenticcommerce-production.up.railway.app/api/v1/auth/login`
- Register: `POST https://agenticcommerce-production.up.railway.app/api/v1/auth/register`
- Products: `GET https://agenticcommerce-production.up.railway.app/api/v1/products`
- etc.

## Current Issue: Metro Bundler

**The app is NOT connected to Railway yet because:**
1. ❌ The app can't load (Metro bundler issue)
2. ⚠️ Once the app loads, it WILL use Railway automatically

## Fix Steps (In Order)

### Step 1: Fix Metro Connection (Required First)
```bash
# 1. Set up port forwarding
adb reverse tcp:8081 tcp:8081

# 2. Start Metro bundler
cd apps/mobile-new
npx expo start --dev-client

# 3. Reload app (shake device > Reload)
```

### Step 2: Verify Railway Connection (After App Loads)
Once the app loads successfully:
1. Try to login or register
2. Check Logcat for API calls:
   ```bash
   adb logcat | grep -i "railway\|api\|network"
   ```
3. Look for network requests in Logcat

## Troubleshooting Railway Connection

### If Railway is not accessible:

1. **Check Railway service status:**
   - Go to Railway dashboard
   - Verify the service is deployed and running
   - Check logs in Railway

2. **Test from browser:**
   - Open: `https://agenticcommerce-production.up.railway.app/api/v1`
   - Should see API response or error page

3. **Check network permissions:**
   - AndroidManifest.xml should have INTERNET permission
   - Check if device has internet connection

4. **Check SSL/TLS:**
   - Railway uses HTTPS
   - Android should trust Railway's SSL certificate
   - If using custom domain, check certificate

## Configuration Files

**API Configuration:**
- `src/config/api.ts` - API URL configuration
- `src/services/api.ts` - API service using the configured URL

**Network Permissions:**
- `android/app/src/main/AndroidManifest.xml` - Should include `<uses-permission android:name="android.permission.INTERNET" />`

## Summary

✅ **App is configured** to use Railway  
❌ **App can't connect yet** because Metro bundler isn't running  
🔧 **Fix Metro first**, then Railway API will work automatically  

---

**Next Step:** Fix the Metro bundler connection so the app can load, then Railway API calls will work automatically! 🚀

