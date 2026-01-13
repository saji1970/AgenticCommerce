# Fix Railway Environment Variable - URGENT

## The Problem
Railway is using the WRONG Anthropic model name in the environment variable.

**Current (WRONG)**: `ANTHROPIC_MODEL=claude-sonnet-4.5-20250929` (has dot: 4.5)
**Correct**: `ANTHROPIC_MODEL=claude-sonnet-4-5-20250929` (has hyphen: 4-5)

## Quick Fix - Railway Web Dashboard (5 minutes)

### Step 1: Open Railway Dashboard
1. Go to: https://railway.app/dashboard
2. Login if needed

### Step 2: Navigate to Backend Service
1. Find your project: **agenticcommerce-production** (or similar name)
2. Click on it to open
3. You'll see your services - click on the **backend** service

### Step 3: Update the Variable
1. Click on the **"Variables"** tab at the top
2. Scroll through the list and find: `ANTHROPIC_MODEL`
3. Click on it to edit (or click the pencil/edit icon)
4. Change the value:
   - FROM: `claude-sonnet-4.5-20250929`
   - TO: `claude-sonnet-4-5-20250929`

   **IMPORTANT**: Change the dot (.) to hyphen (-) → `4.5` becomes `4-5`

5. Click **"Update"** or **"Save"**

### Step 4: Wait for Redeployment
Railway will automatically redeploy your backend with the new variable.
- Watch the **"Deployments"** tab
- Wait for status to become **"Success"** (usually 1-2 minutes)

### Step 5: Test
Once deployed, test the search functionality in your mobile app.

## Alternative - Railway CLI (if you prefer command line)

```bash
# Login to Railway
railway login

# This will open a browser window to authenticate
# After login, return to terminal

# Link to your project (if not already linked)
railway link

# Update the variable
railway variables set ANTHROPIC_MODEL=claude-sonnet-4-5-20250929

# Check it was set correctly
railway variables

# Redeploy (optional - Railway auto-deploys)
railway up
```

## How to Verify the Fix Worked

### Check Logs
1. In Railway dashboard → Backend service → **"Deployments"** tab
2. Click on the latest deployment
3. View logs
4. You should NO LONGER see: `model: claude-sonnet-4.5-20250929 was not found`
5. Search should now work!

### Test in Mobile App
1. Open your mobile app
2. Go to Search screen
3. Search for "chair" or any product
4. Should return results successfully instead of 503 error

## Why This Happened

When you initially set up Railway using `API_KEYS_SETUP.md`, the documentation had the wrong model name (with dot instead of hyphen). This has now been fixed in the documentation, but your Railway environment still has the old wrong value.

Environment variables override code defaults, so even though we fixed the code, Railway keeps using the wrong variable value until you manually update it.

## Status
- ✅ Code fixed (env.ts)
- ✅ Documentation fixed (API_KEYS_SETUP.md, .env.example)
- ⏳ **Railway environment variable - YOU NEED TO UPDATE THIS NOW**
- ⏳ Test after Railway redeploys

## Need Help?
If you have trouble finding the variable in Railway dashboard, look for the **"Variables"** section. It might also be called "Environment Variables" or under a "Settings" tab.
