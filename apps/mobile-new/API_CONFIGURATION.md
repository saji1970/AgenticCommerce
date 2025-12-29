# API Configuration

## ✅ Current Configuration

The mobile app is configured to use the Railway backend:

**Railway URL:** `https://agenticcommerce-production.up.railway.app/api/v1`

## 📍 Configuration File

The API URL is configured in: `apps/mobile-new/src/config/api.ts`

```typescript
const RAILWAY_API_URL = 'https://agenticcommerce-production.up.railway.app/api/v1';

export const API_URL = RAILWAY_API_URL;
export const API_BASE_URL = RAILWAY_API_URL.replace('/api/v1', '');
```

## 🔄 Changing the URL

If you need to change the Railway URL in the future:

1. Edit `apps/mobile-new/src/config/api.ts`
2. Update the `RAILWAY_API_URL` constant
3. Restart the Expo server: `npm start -- --clear`

## ✅ Verification

To verify the backend is accessible:

1. Check health endpoint:
   ```
   https://agenticcommerce-production.up.railway.app/health
   ```

2. The app will use this URL for all API requests:
   - Authentication (login/register)
   - AI Agent chat
   - Product search
   - Orders
   - User profile

## 📝 Notes

- The app **always uses Railway** (no localhost fallback)
- Make sure CORS is configured on Railway to allow requests from your mobile app
- All API requests will go to: `https://agenticcommerce-production.up.railway.app/api/v1`



