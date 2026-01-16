# Railway Deployment Troubleshooting

## Error: "Failed to snapshot repository"

This is a **temporary Railway infrastructure issue**, not a code problem.

### Immediate Solutions

#### 1. Wait and Retry (Recommended)
- Wait 5-10 minutes
- Go to Railway Dashboard → Service → **Deployments**
- Click **"Redeploy"** or trigger a new deployment

#### 2. Check Repository Status
- Ensure GitHub repository is accessible
- Check if there are any GitHub API rate limits
- Verify the repository connection in Railway settings

#### 3. Clear Build Cache
- Go to Railway Dashboard → Service → **Settings**
- Click **"Clear Build Cache"**
- Retry deployment

#### 4. Manual Trigger
- Make a small change (like updating a comment)
- Commit and push to trigger a new deployment
- Or use Railway CLI: `railway up`

### Alternative: Use Railway CLI

If dashboard deployment keeps failing:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to service
cd apps/mandate-service
railway link --service 025ad39c-870a-486a-901d-db9a2d6671d9

# Deploy
railway up
```

### Check Service Configuration

Ensure the service is configured correctly:

1. **Root Directory**: `apps/mandate-service`
2. **Build Command**: Auto-detected from `nixpacks.toml`
3. **Start Command**: Auto-detected from `railway.json`

### Verify Repository Connection

1. Go to Railway Dashboard → Project → **Settings**
2. Check **"Source"** tab
3. Verify GitHub repository is connected
4. Check if webhook is active

### Common Causes

1. **GitHub API Rate Limiting** - Temporary, wait and retry
2. **Large Repository** - Railway may need more time to snapshot
3. **Network Issues** - Temporary connectivity problems
4. **Railway Service Outage** - Check Railway status page

### If Issue Persists

1. **Check Railway Status**: https://status.railway.app
2. **Contact Railway Support**: support@railway.app
3. **Try Different Branch**: Deploy from a different branch temporarily
4. **Check Logs**: Railway Dashboard → Service → **Logs** for more details

### Quick Fix: Force New Deployment

```bash
# Make a trivial change to trigger new deployment
echo "# Deployment trigger" >> apps/mandate-service/README.md
git add apps/mandate-service/README.md
git commit -m "Trigger deployment"
git push origin master
```

### Verify Build Configuration

The service should use:
- **Root**: `apps/mandate-service`
- **Build**: `nixpacks.toml` in root directory
- **Start**: Command from `railway.json`

If Railway is not detecting the root directory correctly, you may need to:
1. Delete and recreate the service
2. Or manually set all build commands in Railway settings
