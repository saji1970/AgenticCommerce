# Deploy Mandate Service to Railway

## Service Information
- **Service Name**: pure-wonder
- **Service ID**: 025ad39c-870a-486a-901d-db9a2d6671d9

## Deployment Steps

### Option 1: Using Railway Dashboard

1. **Go to Railway Dashboard**
   - Navigate to your Railway project
   - Find the service "pure-wonder" (ID: 025ad39c-870a-486a-901d-db9a2d6671d9)

2. **Configure Service Settings**
   - Click on the service
   - Go to **Settings** tab
   - Set **Root Directory** to: `apps/mandate-service`
   - Railway will auto-detect the `railway.json` configuration

3. **Set Environment Variables**
   Add these environment variables in Railway:
   ```
   DATABASE_URL=<your-database-url>
   MANDATE_SERVICE_PORT=3001
   NODE_ENV=production
   JWT_SECRET=<your-jwt-secret>
   CORS_ORIGIN=*
   ```

4. **Deploy**
   - Railway will automatically deploy when you push to the connected branch
   - Or click **"Deploy"** in the dashboard

### Option 2: Using Railway CLI

1. **Install Railway CLI** (if not installed)
   ```bash
   npm i -g @railway/cli
   railway login
   ```

2. **Link to Service**
   ```bash
   cd apps/mandate-service
   railway link --service 025ad39c-870a-486a-901d-db9a2d6671d9
   ```

3. **Set Environment Variables**
   ```bash
   railway variables set DATABASE_URL=<your-database-url>
   railway variables set MANDATE_SERVICE_PORT=3001
   railway variables set NODE_ENV=production
   railway variables set JWT_SECRET=<your-jwt-secret>
   railway variables set CORS_ORIGIN=*
   ```

4. **Deploy**
   ```bash
   railway up
   ```

### Option 3: Connect GitHub Repo

1. **In Railway Dashboard**
   - Go to service "pure-wonder"
   - Click **Settings** → **Source**
   - Connect your GitHub repository
   - Set **Root Directory** to: `apps/mandate-service`
   - Set **Branch** to: `master` (or your main branch)

2. **Railway will auto-deploy** on every push

## Run Migrations

After deployment, run the database migrations:

### Using Railway CLI
```bash
railway run --service 025ad39c-870a-486a-901d-db9a2d6671d9 psql $DATABASE_URL -f migrations/001_create_merchants_table.sql
railway run --service 025ad39c-870a-486a-901d-db9a2d6671d9 psql $DATABASE_URL -f migrations/002_create_ai_agent_apps_table.sql
```

### Using Railway Dashboard
1. Go to service → **Deployments** → **Latest Deployment**
2. Click **"Shell"** or **"Logs"**
3. Run migrations manually:
   ```bash
   psql $DATABASE_URL -f migrations/001_create_merchants_table.sql
   psql $DATABASE_URL -f migrations/002_create_ai_agent_apps_table.sql
   ```

## Verify Deployment

1. **Check Health Endpoint**
   ```bash
   curl https://pure-wonder-production.up.railway.app/health
   ```
   Expected response:
   ```json
   {
     "status": "ok",
     "service": "mandate-service"
   }
   ```

2. **Test Merchant API**
   ```bash
   curl https://pure-wonder-production.up.railway.app/api/merchants
   ```

3. **Test AI Agent Apps API**
   ```bash
   curl https://pure-wonder-production.up.railway.app/api/ai-agent-apps
   ```

## Service URL

After deployment, Railway will generate a public URL. You can find it in:
- **Railway Dashboard** → Service → **Settings** → **Generate Domain**
- Or check the **Deployments** tab for the service URL

The URL will be something like:
- `https://pure-wonder-production.up.railway.app`

## Update Shopping App Backend

Once the mandate service is deployed, update your shopping app backend to connect to it:

Add environment variable in shopping app backend service:
```
MANDATE_SERVICE_URL=https://pure-wonder-production.up.railway.app
```

## Troubleshooting

### Service Not Starting
- Check **Logs** in Railway dashboard
- Verify `DATABASE_URL` is set correctly
- Ensure `MANDATE_SERVICE_PORT` is set (defaults to 3001)

### Build Failures
- Check that `pnpm` is available in build
- Verify `package.json` has correct scripts
- Check `nixpacks.toml` configuration

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Ensure database is accessible from Railway
- Check database credentials

### Migration Errors
- Ensure migrations are run after service is deployed
- Check database connection before running migrations
- Verify table doesn't already exist (migrations use `IF NOT EXISTS`)

## Monitoring

- **Logs**: Railway Dashboard → Service → **Logs**
- **Metrics**: Railway Dashboard → Service → **Metrics**
- **Deployments**: Railway Dashboard → Service → **Deployments**
