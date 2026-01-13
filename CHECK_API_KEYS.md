# API Keys Configuration Check

## Current Status

Your backend health check is working: ✅
```json
{"status":"ok","timestamp":"2026-01-13T08:21:32.663Z"}
```

However, the AI search functionality requires these API keys to be configured on Railway.

## Required API Keys

### 1. Anthropic Claude API
**Environment Variable**: `ANTHROPIC_API_KEY`
**Used For**:
- Filtering shoppable products from Google search results
- Extracting product data from web pages (name, price, description)
- Generating filters for search results

**Without it**: Search will fail with "AI service error"

### 2. Google Custom Search API
**Environment Variables**:
- `GOOGLE_API_KEY`
- `GOOGLE_SEARCH_ENGINE_ID`

**Used For**:
- Finding product URLs from search queries
- Initial product discovery

**Without it**: Search will fail with "Google Search API not configured"

## How to Check if API Keys are Configured

### Method 1: Check Railway Dashboard
1. Go to https://railway.app
2. Select your project: `agenticcommerce-production`
3. Click on your backend service
4. Go to "Variables" tab
5. Look for:
   - `ANTHROPIC_API_KEY`
   - `GOOGLE_API_KEY`
   - `GOOGLE_SEARCH_ENGINE_ID`

### Method 2: Check Backend Logs
The backend logs warnings on startup if keys are missing:
```
⚠️  Anthropic API key not configured
⚠️  Google Search API credentials not configured
```

Check Railway logs:
1. Railway Dashboard → Your Service → "Deployments" tab
2. Click latest deployment
3. View logs
4. Look for warnings about missing API keys

### Method 3: Test Search Endpoint (Requires Auth Token)
You need a valid auth token to test this. If you can log into the mobile app, the app will use the token.

## Current Issues You're Seeing

Based on the mobile app errors:

1. **"Failed to load search history: 500"**
   - ✅ **FIXED** by the route ordering fix we deployed
   - May still show if user hasn't logged in

2. **"Failed to load mandates: Cannot read property 'get' of undefined"**
   - This is a client-side error
   - Likely happening before login
   - Should go away once user authenticates

## Alternative Approaches (If API Keys Not Working)

If you don't have API keys configured or want to avoid API costs, here are alternatives:

### Option 1: Manual Product Entry (Simple & Free)
**What**: Remove AI search, allow users to manually add products
**How**:
- User enters product URL
- App creates a product record with basic info
- User manually fills in name, price, description
- No AI extraction needed

**Pros**:
- ✅ No API costs
- ✅ Works immediately
- ✅ Simple implementation

**Cons**:
- ❌ Manual data entry required
- ❌ No automatic product discovery

### Option 2: MCP-Only Search (Free)
**What**: Use only MCP (Model Context Protocol) servers
**How**:
- MCP servers can integrate with e-commerce sites
- No Google Search needed
- No Anthropic AI needed (if MCP provides structured data)

**Pros**:
- ✅ Free
- ✅ Structured product data from MCP

**Cons**:
- ❌ Limited product sources
- ❌ MCP servers need setup

### Option 3: Web Scraping (Free but Complex)
**What**: Direct web scraping without AI
**How**:
- Search specific e-commerce sites directly (Amazon, eBay, etc.)
- Use CSS selectors to extract product data
- No AI needed, just parsing

**Pros**:
- ✅ Free
- ✅ Reliable for known sites

**Cons**:
- ❌ Site-specific scrapers needed
- ❌ Breaks when sites change HTML
- ❌ May violate terms of service

### Option 4: Use Free AI Alternatives
**What**: Replace Anthropic with free AI APIs
**Options**:
- **Groq** (free tier, very fast)
- **Together AI** (free credits)
- **OpenRouter** (some free models)

**Pros**:
- ✅ Free or cheap
- ✅ Similar functionality

**Cons**:
- ❌ Requires code changes
- ❌ May have lower quality results

### Option 5: Simplified Search (Hybrid Approach)
**What**: Combine manual entry with optional AI enhancement
**How**:
1. User enters product URL
2. App tries to extract Open Graph meta tags (no AI needed)
3. If that fails, user enters info manually
4. Optional: Use AI only for enhancement (if API key available)

**Pros**:
- ✅ Works without API keys
- ✅ Better UX with API keys
- ✅ Graceful degradation

**Cons**:
- ❌ Requires implementation

## Recommendation

### Short-term: Check Railway Configuration
1. **Verify API keys are set** on Railway
2. **If keys are set**: The search should work, test it
3. **If keys are missing**: Decide between adding keys or implementing an alternative

### Long-term: Implement Option 5 (Hybrid Approach)
This gives you the best of both worlds:
- Works without expensive APIs
- Better experience when APIs are available
- Future-proof as you scale

## API Key Setup (If You Want to Use Anthropic + Google)

### Get Anthropic API Key (Free $5 Credit)
1. Go to https://console.anthropic.com/
2. Sign up for an account
3. Get $5 free credit
4. Copy your API key

### Get Google Custom Search API Key
1. Go to https://console.cloud.google.com/
2. Create a project
3. Enable "Custom Search JSON API"
4. Create credentials → API key
5. Copy the API key

### Get Google Search Engine ID
1. Go to https://programmablesearchengine.google.com/
2. Create a new search engine
3. Configure it to search the entire web
4. Copy the Search Engine ID (cx parameter)

### Add to Railway
1. Railway Dashboard → Your Service → Variables
2. Add:
   ```
   ANTHROPIC_API_KEY=your-key-here
   GOOGLE_API_KEY=your-key-here
   GOOGLE_SEARCH_ENGINE_ID=your-cx-here
   ```
3. Railway will auto-redeploy

## Cost Estimates (If Using APIs)

### Anthropic Claude API
- **Free Tier**: $5 credit (enough for ~100-200 product extractions)
- **After Free Tier**: ~$0.015 per product extraction
- **For 1000 products**: ~$15

### Google Custom Search API
- **Free Tier**: 100 queries per day
- **After Free Tier**: $5 per 1000 queries
- **For 30 searches/day**: FREE (within limit)

## Next Steps

**Tell me**:
1. Do you have API keys configured on Railway?
2. If not, which approach do you prefer:
   - Add API keys (costs money after free tier)
   - Manual product entry (free, simple)
   - Hybrid approach (free with optional AI)
   - Different approach?

I can help implement whichever approach you choose!
