# Railway API Configuration

The mobile app is configured to use Railway for the backend API.

## Setup

1. **Get your Railway URL:**
   ```bash
   railway domain
   ```
   Or check your Railway dashboard for the public URL.

2. **Update the API URL:**
   Edit `apps/mobile/src/config/api.ts` and replace `'https://your-app.railway.app/api/v1'` with your actual Railway URL.

   Example:
   ```typescript
   const RAILWAY_API_URL = 'https://agenticcommerce-production.up.railway.app/api/v1';
   ```

## Configuration

The app uses:
- **Development mode** (`__DEV__ = true`): `http://localhost:3000/api/v1`
- **Production mode** (`__DEV__ = false`): Your Railway URL

## Testing

After updating the Railway URL:

1. **For development builds:**
   - The app will use localhost by default
   - To test with Railway, set `__DEV__ = false` or modify the config

2. **For production builds:**
   - The app will automatically use the Railway URL

## Environment Variables (Alternative)

If you prefer using environment variables, you can:

1. Create a `.env` file in `apps/mobile/`:
   ```
   API_URL=https://your-app.railway.app/api/v1
   ```

2. Use a library like `react-native-config` to read it:
   ```bash
   npm install react-native-config
   ```

3. Update `apps/mobile/src/config/api.ts` to use it:
   ```typescript
   import Config from 'react-native-config';
   export const API_URL = Config.API_URL || 'http://localhost:3000/api/v1';
   ```

## Current Configuration

- **API Service**: `apps/mobile/src/services/api.ts` → Uses `API_URL` from config
- **AP2 Mandates**: `apps/mobile/src/hooks/useAP2Mandates.ts` → Uses `API_BASE_URL` from config

