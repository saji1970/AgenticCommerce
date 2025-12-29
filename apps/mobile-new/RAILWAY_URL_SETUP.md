# Railway URL Setup

## ⚠️ Important: Update Your Railway URL

The app is now configured to use Railway backend instead of localhost. However, you need to provide your actual Railway deployment URL.

## Step 1: Get Your Railway URL

### Option 1: Using Railway CLI

```bash
# Login to Railway (if not already logged in)
railway login

# Get your Railway domain
railway domain
```

### Option 2: Railway Dashboard

1. Go to https://railway.app/dashboard
2. Select your project
3. Select your backend service
4. Go to Settings → Domains
5. Copy your Railway URL (e.g., `https://your-app.up.railway.app`)

## Step 2: Update API Configuration

Edit `apps/mobile-new/src/config/api.ts`:

```typescript
const RAILWAY_API_URL = 'https://your-actual-app.up.railway.app/api/v1';
```

Replace `your-actual-app.up.railway.app` with your actual Railway domain.

## Step 3: Verify

After updating the URL, restart your Expo server:

```bash
cd apps/mobile-new
npm start -- --clear
```

## Example

If your Railway URL is `https://agenticcommerce-production.up.railway.app`, then:

```typescript
const RAILWAY_API_URL = 'https://agenticcommerce-production.up.railway.app/api/v1';
```

## Note

- The app now **always uses Railway** (no localhost fallback)
- Make sure your Railway backend is deployed and running
- Ensure CORS is properly configured on your Railway backend to allow requests from your mobile app



