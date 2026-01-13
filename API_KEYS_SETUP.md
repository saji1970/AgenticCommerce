# API Keys Configuration Guide

## Issue: Product Search Not Working

The product search functionality requires two API services:
1. **Anthropic API** (Claude AI) - For filtering products and extracting data
2. **Google Custom Search API** - For searching products on the web

Without these API keys configured, you'll get **400 Bad Request** or **Internal Server Error** responses.

## Required API Keys

### 1. Anthropic API Key

**What it's used for:**
- Filtering shoppable products from search results
- Extracting product data from web pages (name, price, description, etc.)
- Generating product filters

**How to get it:**
1. Go to https://console.anthropic.com/settings/keys
2. Sign up or log in
3. Create a new API key
4. Copy the key (starts with `sk-ant-...`)

**Pricing:**
- Pay-as-you-go: ~$3 per million tokens
- Each search uses ~10,000-50,000 tokens (~$0.03-$0.15 per search)

### 2. Google Custom Search API

**What it's used for:**
- Searching Google for products based on user query

**How to get it:**

#### Step 1: Get Google API Key
1. Go to https://console.cloud.google.com/apis/credentials
2. Create a new project (or select existing)
3. Click "Create Credentials" > "API Key"
4. Copy the API key
5. Enable "Custom Search API" for your project:
   - Go to https://console.cloud.google.com/apis/library/customsearch.googleapis.com
   - Click "Enable"

#### Step 2: Create Search Engine ID
1. Go to https://programmablesearchengine.google.com/
2. Click "Add" to create a new search engine
3. Configuration:
   - **Sites to search**: Leave empty or enter `*` (to search entire web)
   - **Name**: AgenticCommerce Product Search
   - **Search the entire web**: Enable this option
4. Click "Create"
5. Copy the **Search Engine ID** (looks like: `0123456789abcdefg`)

**Pricing:**
- Free tier: 100 queries per day
- Paid: $5 per 1,000 queries after free tier

## Configuration

### Option 1: Local Development

Edit `apps/backend/.env` and add your keys:

```bash
# Anthropic (Claude AI)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxx
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929

# Google Custom Search API
GOOGLE_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_SEARCH_ENGINE_ID=0123456789abcdefg
```

Then restart your backend server:
```bash
cd apps/backend
npm run dev
```

### Option 2: Railway Production (RECOMMENDED)

Since your mobile app uses the Railway backend, you need to set these on Railway:

#### Method 1: Railway Web Dashboard
1. Go to https://railway.app/dashboard
2. Select your `AgenticCommerce` project
3. Click on the backend service
4. Go to "Variables" tab
5. Add the following variables:
   - `ANTHROPIC_API_KEY` = `sk-ant-api03-xxxxxxxxxxxx`
   - `ANTHROPIC_MODEL` = `claude-sonnet-4.5-20250929`
   - `GOOGLE_API_KEY` = `AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxx`
   - `GOOGLE_SEARCH_ENGINE_ID` = `0123456789abcdefg`
6. Click "Deploy" or wait for auto-redeploy

#### Method 2: Railway CLI
```bash
# Login to Railway
railway login

# Link to your project
railway link

# Set variables
railway variables set ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxx
railway variables set ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
railway variables set GOOGLE_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxx
railway variables set GOOGLE_SEARCH_ENGINE_ID=0123456789abcdefg

# Redeploy
railway up
```

## Verification

### Test Backend API

Once configured, test that the backend can access the APIs:

```bash
# Test from your machine
curl -X POST https://agenticcommerce-production.up.railway.app/api/products/ai-search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"query": "gaming laptop"}'
```

You should get a response with products, not an error.

### Test in Mobile App

1. Open the mobile app
2. Go to the Search tab
3. Enter a product query (e.g., "running shoes")
4. Wait for results (15-30 seconds)
5. You should see a success message with product count

## Troubleshooting

### Error: "Google Search API not configured"
- **Cause**: GOOGLE_API_KEY or GOOGLE_SEARCH_ENGINE_ID is missing
- **Fix**: Set both environment variables on Railway

### Error: "AI service error"
- **Cause**: ANTHROPIC_API_KEY is missing or invalid
- **Fix**: Verify your Anthropic API key at https://console.anthropic.com/settings/keys

### Error: "Google Search API authentication failed"
- **Cause**: Invalid GOOGLE_API_KEY or API not enabled
- **Fix**:
  1. Verify key at https://console.cloud.google.com/apis/credentials
  2. Enable Custom Search API at https://console.cloud.google.com/apis/library/customsearch.googleapis.com

### Error: "Rate limit exceeded"
- **Cause**: Exceeded Google's 100 queries/day free tier
- **Fix**: Upgrade to paid tier or wait 24 hours

### Products not found
- **Cause**: Query too specific or no results
- **Fix**: Try broader search terms (e.g., "laptop" instead of "ASUS ROG Strix G15 2024 model")

## Cost Estimates

For 100 product searches:
- **Anthropic API**: $3 - $15 (depending on results)
- **Google Custom Search**: Free (within 100/day limit), or $0.50 if paid tier

**Monthly estimate (10 searches/day):**
- Anthropic: $9 - $45
- Google: Free (or $15 if paid tier)

## Security Notes

- **Never commit API keys to Git** - they're in .gitignore
- **Rotate keys regularly** - especially if exposed
- **Use environment variables** - never hardcode in source
- **Monitor usage** - set up billing alerts in both consoles

## Support Links

- **Anthropic Console**: https://console.anthropic.com/
- **Google Cloud Console**: https://console.cloud.google.com/
- **Custom Search Engine**: https://programmablesearchengine.google.com/
- **Railway Dashboard**: https://railway.app/dashboard
