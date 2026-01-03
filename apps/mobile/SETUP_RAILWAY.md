# Quick Setup: Connect Mobile App to Railway Backend

## Step 1: Get Your Railway URL

Run this command in your backend directory:
```bash
railway domain
```

Or check Railway dashboard → Your Service → Settings → Networking

You'll get something like: `your-app.railway.app`

## Step 2: Create Environment File

Create `apps/mobile/.env`:

```env
EXPO_PUBLIC_RAILWAY_API_URL=https://your-app.railway.app/api/v1
```

**Replace `your-app.railway.app` with your actual Railway domain!**

## Step 3: Restart Expo

```bash
cd apps/mobile
npm start
# Press 'r' to reload, or restart completely
```

## Step 4: Verify Connection

1. Open the app
2. Check the console logs - you should see:
   - ✅ `Connected to Railway backend: https://your-app.railway.app/api/v1`
3. Try sending a message in the chat
4. If Railway is working, you'll get real responses
5. If Railway is down, you'll see demo mode indicator

## Troubleshooting

### Still seeing "Demo Mode" banner?

1. Check `.env` file exists in `apps/mobile/`
2. Verify URL format: `https://your-app.railway.app/api/v1` (include `/api/v1`)
3. Test URL in browser: `https://your-app.railway.app/health`
4. Check Railway service is running
5. Restart Expo completely

### Connection Errors?

1. Verify Railway backend is deployed and running
2. Check Railway logs: `railway logs`
3. Test health endpoint: `curl https://your-app.railway.app/health`
4. Ensure CORS is configured for mobile app origins

### Want to Force Demo Mode?

```env
EXPO_PUBLIC_DEMO_MODE=true
```

### Want Railway with Demo Fallback?

```env
EXPO_PUBLIC_RAILWAY_API_URL=https://your-app.railway.app/api/v1
EXPO_PUBLIC_FALLBACK_TO_DEMO=true
```

This will use Railway when available, demo mode when Railway is down.

