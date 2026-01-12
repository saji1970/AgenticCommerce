# Quick Setup Guide - Free API Keys (5 Minutes)

Follow these steps to enable product search with free API keys.

## Step 1: Get Anthropic API Key (FREE $5 Credits)

### 1.1 Sign Up
1. Go to: **https://console.anthropic.com/**
2. Click "Sign Up" or "Sign In"
3. Use your email or Google account
4. ✅ **No credit card required!**
5. You'll automatically get **$5 in free credits** (worth 150-500 searches)

### 1.2 Get API Key
1. Once logged in, go to: **https://console.anthropic.com/settings/keys**
2. Click "Create Key" or "New Key"
3. Give it a name (e.g., "AgenticCommerce")
4. Click "Create"
5. **Copy the API key** - it starts with `sk-ant-api03-...`
6. ⚠️ Save it somewhere safe - you'll need it in Step 3

**Your key should look like:**
```
sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Step 2: Get Google Custom Search API (FREE 100/day)

### 2.1 Create Google Cloud Project
1. Go to: **https://console.cloud.google.com/**
2. Sign in with your Google account
3. Click "Select a project" at the top
4. Click "New Project"
5. Name it "AgenticCommerce" and click "Create"
6. Wait 30 seconds for it to be created

### 2.2 Get Google API Key
1. Go to: **https://console.cloud.google.com/apis/credentials**
2. Make sure "AgenticCommerce" project is selected (top dropdown)
3. Click "Create Credentials" > "API Key"
4. **Copy the API key** - it looks like `AIzaSy...`
5. ⚠️ Save it somewhere - you'll need it in Step 3

**Your key should look like:**
```
AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2.3 Enable Custom Search API
1. Go to: **https://console.cloud.google.com/apis/library/customsearch.googleapis.com**
2. Click the blue "Enable" button
3. Wait for it to enable (takes 10 seconds)

### 2.4 Create Search Engine
1. Go to: **https://programmablesearchengine.google.com/controlpanel/all**
2. Click "Add" button
3. Fill in:
   - **Name**: AgenticCommerce Product Search
   - **What to search**: Select "Search the entire web"
   - Check the box "Search the entire web"
4. Click "Create"
5. Click "Customize" next to your new search engine
6. **Copy the Search Engine ID** - it's under "Basic" section
7. ⚠️ Save it - you'll need it in Step 3

**Your Search Engine ID should look like:**
```
a1b2c3d4e5f6g7h8i
```

---

## Step 3: Configure Railway Environment Variables

Now you have 3 keys:
- ✅ Anthropic API Key (starts with `sk-ant-api03-`)
- ✅ Google API Key (starts with `AIzaSy`)
- ✅ Google Search Engine ID (random letters/numbers)

### 3.1 Add Variables to Railway
1. Go to: **https://railway.app/dashboard**
2. Sign in if needed
3. Click on your **AgenticCommerce** project
4. Click on the **backend** service (the one with the API)
5. Click on the **"Variables"** tab
6. Click **"+ New Variable"** and add each of these:

**Variable 1:**
```
Name: ANTHROPIC_API_KEY
Value: [paste your sk-ant-api03-... key here]
```

**Variable 2:**
```
Name: GOOGLE_API_KEY
Value: [paste your AIzaSy... key here]
```

**Variable 3:**
```
Name: GOOGLE_SEARCH_ENGINE_ID
Value: [paste your search engine ID here]
```

7. Railway will **automatically redeploy** your backend (takes 2-3 minutes)

### 3.2 Wait for Deployment
- Watch for the "Deploying..." status to change to "Active"
- Takes about 2-3 minutes
- You'll see logs showing the deployment progress

---

## Step 4: Test Product Search

### 4.1 Open Your Mobile App
1. Launch the AgenticCommerce app on your emulator/device
2. Make sure you're logged in
3. Go to the **"Search"** tab at the bottom

### 4.2 Try a Search
1. Type a product query, for example:
   - "gaming laptop"
   - "running shoes"
   - "wireless headphones"
2. Tap the search button
3. **Wait 15-30 seconds** (it's doing AI processing)
4. You should see a success message: "Found X products in Y seconds"

### 4.3 Expected Results
✅ **Success**: Alert showing product count and processing time
❌ **Still fails**: Check Step 5 below

---

## Step 5: Troubleshooting

### Error: "Google Search API not configured"
- ✅ Check Railway variables are saved correctly
- ✅ Make sure variable names are exact (no typos)
- ✅ Wait for Railway deployment to finish (check "Active" status)

### Error: "AI service error"
- ✅ Check Anthropic API key is correct
- ✅ Verify you have credits at: https://console.anthropic.com/settings/usage
- ✅ Make sure key starts with `sk-ant-api03-`

### Error: "Google Search API authentication failed"
- ✅ Go to https://console.cloud.google.com/apis/library/customsearch.googleapis.com
- ✅ Make sure it says "API Enabled"
- ✅ Check Google API key is correct

### Still Not Working?
1. Check Railway logs:
   - Go to Railway dashboard
   - Click backend service
   - Click "Deployments" tab
   - Click latest deployment
   - Look for error messages in logs

2. Restart Railway deployment:
   - Go to backend service
   - Click "..." menu
   - Click "Restart"

---

## Monitor Your Free Usage

### Anthropic Credits ($5 Free)
- Check remaining balance: **https://console.anthropic.com/settings/usage**
- You'll get email alerts when running low
- Each search costs ~$0.01-$0.03
- **Good for 150-500 searches**

### Google Queries (100/day Free)
- Check usage: **https://console.cloud.google.com/apis/dashboard**
- Select "Custom Search API"
- View daily quota usage
- **Resets every 24 hours at midnight UTC**

---

## What You Get For Free

✅ **$5 Anthropic credits** = 150-500 product searches
✅ **100 Google searches/day** = forever free, resets daily
✅ **Total**: Enough for testing, demos, and light usage
✅ **No credit card required** for either service

---

## Quick Reference

Your environment variables should look like this in Railway:

```
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_SEARCH_ENGINE_ID=a1b2c3d4e5f6g7h8i
```

---

## Need Help?

If you get stuck:
1. Check the error message in your mobile app
2. Check Railway deployment logs
3. Verify all 3 environment variables are set correctly
4. Make sure Railway deployment shows "Active" status

The setup should take about 5 minutes total. Once configured, product search will work immediately!
