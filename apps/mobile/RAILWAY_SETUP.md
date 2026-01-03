# Railway Backend Setup for Mobile App

This guide explains how to configure the mobile app to use your Railway-deployed backend.

## Quick Setup

### 1. Get Your Railway URL

After deploying your backend to Railway, get your app URL:

**Option A: Railway CLI**
```bash
railway domain
```

**Option B: Railway Dashboard**
1. Go to https://railway.app
2. Select your backend project
3. Click on your service
4. Go to Settings → Networking
5. Copy your public domain (e.g., `your-app.railway.app`)

### 2. Configure Mobile App

Create a `.env` file in `apps/mobile/`:

```env
EXPO_PUBLIC_RAILWAY_API_URL=https://your-app.railway.app/api/v1
```

Replace `your-app.railway.app` with your actual Railway domain.

### 3. Update Config File (Alternative)

If you prefer to hardcode it, edit `apps/mobile/src/config/index.ts`:

```typescript
const RAILWAY_API_URL = 'https://your-actual-app.railway.app/api/v1';
```

## Environment Variables

### Required
- `EXPO_PUBLIC_RAILWAY_API_URL` - Your Railway backend URL with `/api/v1` path

### Optional
- `EXPO_PUBLIC_DEMO_MODE` - Set to `'true'` to force demo mode
- `EXPO_PUBLIC_FALLBACK_TO_DEMO` - Set to `'true'` to use demo mode if Railway is unreachable

## How It Works

1. **Railway Backend (Default)**: App connects to your Railway backend
2. **Demo Mode (Fallback)**: If Railway is unreachable and `EXPO_PUBLIC_FALLBACK_TO_DEMO=true`, uses demo data
3. **Demo Mode (Forced)**: If `EXPO_PUBLIC_DEMO_MODE=true`, always uses demo data

## Testing Connection

The app automatically tests the Railway connection on startup:

- ✅ **Connected**: Uses Railway backend
- ⚠️ **Unreachable**: Falls back to demo mode (if enabled)
- 🔵 **Not Configured**: Uses demo mode

## Example Configuration

```env
# Production Railway URL
EXPO_PUBLIC_RAILWAY_API_URL=https://agentic-commerce-production.railway.app/api/v1

# Enable fallback to demo if Railway is down
EXPO_PUBLIC_FALLBACK_TO_DEMO=true
```

## Troubleshooting

### App Still Using Demo Mode

1. Check your `.env` file exists in `apps/mobile/`
2. Verify the Railway URL is correct (include `/api/v1`)
3. Test the URL in browser: `https://your-app.railway.app/health`
4. Check app logs for connection errors

### Backend Not Responding

1. Verify Railway service is running
2. Check Railway logs: `railway logs`
3. Test health endpoint: `curl https://your-app.railway.app/health`
4. Verify CORS is configured for mobile app origin

### CORS Issues

If you see CORS errors, update your Railway backend CORS configuration:

```typescript
// In backend CORS config
const allowedOrigins = [
  'http://localhost:8081', // Expo dev server
  'exp://localhost:8081', // Expo Go
  // Add your production mobile app origins
];
```

## Switching Between Railway and Demo

### Use Railway (Default)
```env
EXPO_PUBLIC_RAILWAY_API_URL=https://your-app.railway.app/api/v1
EXPO_PUBLIC_DEMO_MODE=false
```

### Force Demo Mode
```env
EXPO_PUBLIC_DEMO_MODE=true
```

### Railway with Demo Fallback
```env
EXPO_PUBLIC_RAILWAY_API_URL=https://your-app.railway.app/api/v1
EXPO_PUBLIC_FALLBACK_TO_DEMO=true
```

## Next Steps

1. ✅ Configure Railway URL in `.env`
2. ✅ Test connection
3. ✅ Verify backend endpoints are working
4. ✅ Set up authentication (if required)
5. ✅ Test all features with Railway backend

